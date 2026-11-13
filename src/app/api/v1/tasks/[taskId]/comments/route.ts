import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { CommentService } from '@/server/services/comment.service';
import { createCommentSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

type Params = { taskId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const comments = await CommentService.getTaskComments(session.userId, params.taskId);
  return NextResponse.json({ comments });
});

export const POST = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const { content } = await parseBody(req, createCommentSchema, 'Invalid comment input');
  const comment = await CommentService.createComment(session.userId, params.taskId, content);
  return NextResponse.json({ comment }, { status: 201 });
});
