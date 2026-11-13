import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { route } from '@/server/http/route';

export const GET = route<{ taskId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  const activities = await TaskService.getTaskActivity(session.userId, params.taskId);
  return NextResponse.json({ activities });
});
