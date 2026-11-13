import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { updateTaskSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

type Params = { taskId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const task = await TaskService.getTaskById(session.userId, params.taskId);
  return NextResponse.json({ task });
});

export const PATCH = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, updateTaskSchema, 'Invalid update input');
  const task = await TaskService.updateTask(session.userId, params.taskId, input);
  return NextResponse.json({ task });
});

export const DELETE = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  await TaskService.deleteTask(session.userId, params.taskId);
  return NextResponse.json({ success: true, message: 'Task deleted successfully' });
});
