import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { createTaskSchema, taskListQuerySchema } from '@/server/validation/schemas';
import { parseBody, parseQuery, route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

type Params = { projectId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const filters = parseQuery(req, taskListQuerySchema);
  const tasks = await TaskService.getProjectTasks(session.userId, params.projectId, filters);
  return NextResponse.json({ tasks });
});

export const POST = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, createTaskSchema, 'Invalid task input');
  const task = await TaskService.createTask(session.userId, params.projectId, input);
  return NextResponse.json({ task }, { status: 201 });
});
