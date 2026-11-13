import { db } from '@/db/client';
import { taskComments, taskActivities, notifications, users } from '@/db/schema';
import { TaskService } from './task.service';
import { ProjectService } from './project.service';
import { permissions } from '@/server/authorization/permissions';
import { recordOutboxEvent, publishEvent } from '@/server/events/outbox';
import { ForbiddenError, NotFoundError } from '@/server/errors/app-error';
import { eq, and, sql, asc } from 'drizzle-orm';
import crypto from 'crypto';

export class CommentService {
  static async getTaskComments(userId: string, taskId: string) {
    await TaskService.getTaskById(userId, taskId); // access check

    const comments = await db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        authorId: taskComments.authorId,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        updatedAt: taskComments.updatedAt,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(taskComments)
      .innerJoin(users, eq(taskComments.authorId, users.id))
      .where(and(eq(taskComments.taskId, taskId), sql`${taskComments.deletedAt} IS NULL`))
      .orderBy(asc(taskComments.createdAt));

    return comments;
  }

  static async createComment(userId: string, taskId: string, content: string) {
    const task = await TaskService.getTaskById(userId, taskId);
    const ctx = await ProjectService.getProjectContext(userId, task.projectId);

    if (!permissions.canCommentOnTask(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx, task)) {
      throw new ForbiddenError('You do not have permission to comment on this task');
    }

    const commentId = `comment_${crypto.randomUUID()}`;

    const { newComment, envelope } = await db.transaction(async (tx) => {
      const [comment] = await tx
        .insert(taskComments)
        .values({
          id: commentId,
          organizationId: task.organizationId,
          projectId: task.projectId,
          taskId,
          authorId: userId,
          content,
        })
        .returning();

      // Log activity
      await tx.insert(taskActivities).values({
        id: `act_${crypto.randomUUID()}`,
        organizationId: task.organizationId,
        projectId: task.projectId,
        taskId,
        actorId: userId,
        eventType: 'comment_added',
        newValue: content.substring(0, 100),
        metadata: { commentId: comment.id },
      });

      // Notify task assignee if someone else commented
      if (task.assigneeId && task.assigneeId !== userId) {
        await tx.insert(notifications).values({
          id: `notif_${crypto.randomUUID()}`,
          organizationId: task.organizationId,
          recipientId: task.assigneeId,
          type: 'comment_added',
          resourceType: 'task',
          resourceId: taskId,
          title: 'New Comment on Task',
          message: `A new comment was posted on "${task.title}"`,
        });
      }

      const env = await recordOutboxEvent(
        {
          organizationId: task.organizationId,
          projectId: task.projectId,
          aggregateType: 'task',
          aggregateId: taskId,
          eventType: 'comment.created',
          payload: { comment },
        },
        tx
      );

      return { newComment: comment, envelope: env };
    });

    await publishEvent(envelope);

    const [author] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

    return {
      ...newComment,
      authorName: author?.name,
      authorEmail: author?.email,
    };
  }

  static async updateComment(userId: string, commentId: string, content: string) {
    const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, commentId)).limit(1);
    if (!comment || comment.deletedAt) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenError('Only the author can edit this comment');
    }

    const [updated] = await db
      .update(taskComments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(taskComments.id, commentId))
      .returning();

    return updated;
  }

  static async deleteComment(userId: string, commentId: string) {
    const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, commentId)).limit(1);
    if (!comment || comment.deletedAt) {
      throw new NotFoundError('Comment not found');
    }

    const ctx = await ProjectService.getProjectContext(userId, comment.projectId);
    const canDelete =
      comment.authorId === userId ||
      ctx.orgMemCtx.role === 'owner' ||
      ctx.orgMemCtx.role === 'admin' ||
      ctx.projMemCtx?.role === 'lead';

    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete this comment');
    }

    await db
      .update(taskComments)
      .set({ deletedAt: new Date() })
      .where(eq(taskComments.id, commentId));

    return { success: true };
  }
}

