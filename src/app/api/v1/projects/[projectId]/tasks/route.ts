import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { createTaskSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const searchParams = req.nextUrl.searchParams;
    const statusId = searchParams.get('statusId') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;
    const priority = searchParams.get('priority') || undefined;

    const taskList = await TaskService.getProjectTasks(session.userId, params.projectId, {
      statusId,
      assigneeId,
      priority,
    });
    return NextResponse.json({ tasks: taskList });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = createTaskSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid task input', result.error.flatten().fieldErrors);
    }

    const task = await TaskService.createTask(session.userId, params.projectId, result.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}
