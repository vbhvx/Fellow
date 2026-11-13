import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { ProjectService } from '@/server/services/project.service';
import { route } from '@/server/http/route';

export const GET = route<{ projectId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  const members = await ProjectService.getProjectMembers(session.userId, params.projectId);
  return NextResponse.json({ members });
});
