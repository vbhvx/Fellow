import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { SearchService } from '@/server/services/search.service';
import { BadRequestError, formatErrorResponse } from '@/server/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const organizationId = searchParams.get('organizationId');
    const projectId = searchParams.get('projectId') || undefined;
    const statusId = searchParams.get('statusId') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;

    if (!query) {
      throw new BadRequestError('Search query "q" is required');
    }
    if (!organizationId) {
      throw new BadRequestError('Query parameter "organizationId" is required');
    }

    const results = await SearchService.searchResources(session.userId, organizationId, query, {
      projectId,
      statusId,
      priority,
      assigneeId,
    });

    return NextResponse.json(results);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
