import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { moveTaskSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

export const POST = route<{ taskId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, moveTaskSchema, 'Invalid move parameters');
  const task = await TaskService.moveTask(session.userId, params.taskId, input);
  return NextResponse.json({ task });
});
