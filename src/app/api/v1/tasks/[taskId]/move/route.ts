import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { moveTaskSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function POST(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = moveTaskSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid move parameters', result.error.flatten().fieldErrors);
    }

    const movedTask = await TaskService.moveTask(session.userId, params.taskId, result.data);
    return NextResponse.json({ task: movedTask });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

