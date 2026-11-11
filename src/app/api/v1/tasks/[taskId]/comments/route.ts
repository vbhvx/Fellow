import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { CommentService } from '@/server/services/comment.service';
import { createCommentSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    const comments = await CommentService.getTaskComments(session.userId, params.taskId);
    return NextResponse.json({ comments });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = createCommentSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid comment input', result.error.flatten().fieldErrors);
    }

    const comment = await CommentService.createComment(session.userId, params.taskId, result.data.content);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

