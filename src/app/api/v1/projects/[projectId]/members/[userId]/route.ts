import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { addProjectMemberSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string; userId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const role = body.role || 'member';

    const member = await ProjectService.setProjectMember(
      session.userId,
      params.projectId,
      params.userId,
      role
    );
    return NextResponse.json({ member });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; userId: string } }
) {
  try {
    const session = await requireUser(req);
    await ProjectService.removeProjectMember(session.userId, params.projectId, params.userId);
    return NextResponse.json({ success: true, message: 'Member removed from project' });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

