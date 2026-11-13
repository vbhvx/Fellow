import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { updateProjectSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

type Params = { projectId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const project = await ProjectService.getProjectById(session.userId, params.projectId);
  return NextResponse.json({ project });
});

export const PATCH = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, updateProjectSchema, 'Invalid update input');
  const project = await ProjectService.updateProject(session.userId, params.projectId, input);
  return NextResponse.json({ project });
});

// Projects are archived, never hard-deleted.
export const DELETE = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  await ProjectService.updateProject(session.userId, params.projectId, { archived: true });
  return NextResponse.json({ success: true, message: 'Project archived successfully' });
});
