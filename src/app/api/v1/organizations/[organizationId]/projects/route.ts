import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { createProjectSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await requireUser(req);
    const accessible = await ProjectService.getAccessibleProjects(session.userId, params.organizationId);
    return NextResponse.json({ projects: accessible });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid project input', result.error.flatten().fieldErrors);
    }

    const project = await ProjectService.createProject(session.userId, params.organizationId, result.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
