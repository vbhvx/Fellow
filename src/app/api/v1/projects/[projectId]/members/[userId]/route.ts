import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { setProjectMemberSchema } from '@/server/validation/schemas';
import { parseOptionalBody, route } from '@/server/http/route';

type Params = { projectId: string; userId: string };

export const PUT = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const { role } = await parseOptionalBody(req, setProjectMemberSchema, 'Invalid project member input');
  const member = await ProjectService.setProjectMember(session.userId, params.projectId, params.userId, role);
  return NextResponse.json({ member });
});

export const DELETE = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  await ProjectService.removeProjectMember(session.userId, params.projectId, params.userId);
  return NextResponse.json({ success: true, message: 'Member removed from project' });
});
