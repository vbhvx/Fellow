import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { NotificationService } from '@/server/services/notification.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const organizationId = body.organizationId;

    await NotificationService.markAllAsRead(session.userId, organizationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

