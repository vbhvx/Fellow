import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { updateProjectSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const project = await ProjectService.getProjectById(session.userId, params.projectId);
    return NextResponse.json({ project });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid update input', result.error.flatten().fieldErrors);
    }

    const updated = await ProjectService.updateProject(session.userId, params.projectId, result.data);
    return NextResponse.json({ project: updated });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    await ProjectService.updateProject(session.userId, params.projectId, { archived: true });
    return NextResponse.json({ success: true, message: 'Project archived successfully' });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

