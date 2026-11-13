import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { CommentService } from '@/server/services/comment.service';
import { updateCommentSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

type Params = { commentId: string };

export const PATCH = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const { content } = await parseBody(req, updateCommentSchema, 'Invalid comment input');
  const comment = await CommentService.updateComment(session.userId, params.commentId, content);
  return NextResponse.json({ comment });
});

export const DELETE = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  await CommentService.deleteComment(session.userId, params.commentId);
  return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
});
