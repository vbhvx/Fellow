import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const members = await ProjectService.getProjectMembers(session.userId, params.projectId);
    return NextResponse.json({ members });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

