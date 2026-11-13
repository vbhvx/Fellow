import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { createProjectSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

type Params = { organizationId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const projects = await ProjectService.getAccessibleProjects(session.userId, params.organizationId);
  return NextResponse.json({ projects });
});

export const POST = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, createProjectSchema, 'Invalid project input');
  const project = await ProjectService.createProject(session.userId, params.organizationId, input);
  return NextResponse.json({ project }, { status: 201 });
});
