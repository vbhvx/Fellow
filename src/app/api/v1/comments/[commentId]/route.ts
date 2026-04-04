import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { CommentService } from '@/server/services/comment.service';
import { updateCommentSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = updateCommentSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid comment input', result.error.flatten().fieldErrors);
    }

    const updated = await CommentService.updateComment(session.userId, params.commentId, result.data.content);
    return NextResponse.json({ comment: updated });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const session = await requireUser(req);
    await CommentService.deleteComment(session.userId, params.commentId);
    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

