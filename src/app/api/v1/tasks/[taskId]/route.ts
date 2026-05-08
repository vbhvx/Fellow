import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { updateTaskSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    const task = await TaskService.getTaskById(session.userId, params.taskId);
    return NextResponse.json({ task });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = updateTaskSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid update input', result.error.flatten().fieldErrors);
    }

    const updated = await TaskService.updateTask(session.userId, params.taskId, result.data);
    return NextResponse.json({ task: updated });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    await TaskService.deleteTask(session.userId, params.taskId);
    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

