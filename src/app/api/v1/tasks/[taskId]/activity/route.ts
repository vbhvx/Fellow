import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { TaskService } from '@/server/services/task.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    const activities = await TaskService.getTaskActivity(session.userId, params.taskId);
    return NextResponse.json({ activities });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

