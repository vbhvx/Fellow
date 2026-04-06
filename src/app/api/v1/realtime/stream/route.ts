import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/server/auth/session';
import { broker, ClientConnection } from '@/server/realtime/broker';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const organizationId = req.nextUrl.searchParams.get('organizationId');
  if (!organizationId) {
    return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorize organization access
  let org;
  try {
    org = await OrganizationService.getOrganizationById(session.userId, organizationId);
  } catch {
    return new Response(JSON.stringify({ error: 'Organization access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get all projects the user is authorized to view
  const accessibleProjects = await ProjectService.getAccessibleProjects(session.userId, organizationId);
  const authorizedProjectIds = new Set(accessibleProjects.map((p) => p.id));
  const isAdminOrOwner = org.role === 'owner' || org.role === 'admin';

  const connectionId = `conn_${crypto.randomUUID()}`;
  const encoder = new TextEncoder();

  let keepAliveInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      const clientConnection: ClientConnection = {
        connectionId,
        userId: session.userId,
        organizationId,
        authorizedProjectIds,
        isAdminOrOwner,
        controller,
        encoder,
      };

      broker.register(clientConnection);

      // Send initial welcome/connected frame
      const welcome = `event: system.connected\ndata: ${JSON.stringify({
        connectionId,
        organizationId,
        authorizedProjectCount: authorizedProjectIds.size,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(welcome));

      // Keep-alive heartbeat every 15 seconds
      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(keepAliveInterval);
          broker.unregister(connectionId);
        }
      }, 15000);
    },
    cancel() {
      clearInterval(keepAliveInterval);
      broker.unregister(connectionId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

