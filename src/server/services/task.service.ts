import { db } from '@/db/client';
import {
  tasks,
  workflowStatuses,
  users,
  taskActivities,
  notifications,
  organizationMemberships,
} from '@/db/schema';
import { ProjectService } from './project.service';
import { permissions } from '@/server/authorization/permissions';
import { computePosition, rebalancePositions } from '@/server/ordering/fractional-index';
import { recordOutboxEvent, publishEvent } from '@/server/events/outbox';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '@/server/errors/app-error';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

export class TaskService {
  static async getProjectTasks(
    userId: string,
    projectId: string,
    filters?: { statusId?: string; assigneeId?: string; priority?: string }
  ) {
    const ctx = await ProjectService.getProjectContext(userId, projectId);

    const conditions = [
      eq(tasks.projectId, projectId),
      sql`${tasks.deletedAt} IS NULL`,
    ];

    if (filters?.statusId) {
      conditions.push(eq(tasks.statusId, filters.statusId));
    }
    if (filters?.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    const taskRows = await db
      .select({
        id: tasks.id,
        organizationId: tasks.organizationId,
        projectId: tasks.projectId,
        statusId: tasks.statusId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        createdBy: tasks.createdBy,
        assigneeId: tasks.assigneeId,
        parentTaskId: tasks.parentTaskId,
        dueAt: tasks.dueAt,
        position: tasks.position,
        version: tasks.version,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        completedAt: tasks.completedAt,
        assigneeName: users.name,
        assigneeEmail: users.email,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(...conditions))
      .orderBy(asc(tasks.position));

    return taskRows;
  }

  static async getTaskById(userId: string, taskId: string) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task || task.deletedAt) {
      throw new NotFoundError('Task not found');
    }

    // Tenant & Project access check
    const ctx = await ProjectService.getProjectContext(userId, task.projectId);

    const [status] = await db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.id, task.statusId))
      .limit(1);

    const [creator] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, task.createdBy)).limit(1);
    const [assignee] = task.assigneeId
      ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, task.assigneeId)).limit(1)
      : [null];

    return {
      ...task,
      status,
      creator,
      assignee,
    };
  }

  static async createTask(
    userId: string,
    projectId: string,
    data: {
      title: string;
      description?: string | null;
      statusId: string;
      priority?: any;
      assigneeId?: string | null;
      parentTaskId?: string | null;
      dueAt?: string | null;
      position?: number;
    }
  ) {
    const ctx = await ProjectService.getProjectContext(userId, projectId);
    if (!permissions.canCreateTask(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx)) {
      throw new ForbiddenError('You do not have permission to create tasks in this project');
    }

    // Validate status belongs to project
    const [status] = await db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.id, data.statusId), eq(workflowStatuses.projectId, projectId)))
      .limit(1);

    if (!status) {
      throw new BadRequestError('Invalid workflow status for this project');
    }

    // Validate assignee belongs to organization
    if (data.assigneeId) {
      const [assigneeMem] = await db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, ctx.project.organizationId),
            eq(organizationMemberships.userId, data.assigneeId)
          )
        )
        .limit(1);

      if (!assigneeMem) {
        throw new BadRequestError('Assignee is not a member of this organization');
      }
    }

    let pos = data.position;
    if (pos === undefined) {
      // Put at end of column
      const existing = await db
        .select({ position: tasks.position })
        .from(tasks)
        .where(and(eq(tasks.statusId, data.statusId), sql`${tasks.deletedAt} IS NULL`))
        .orderBy(desc(tasks.position))
        .limit(1);

      pos = existing.length > 0 ? existing[0].position + 1000.0 : 1000.0;
    }

    const taskId = `task_${crypto.randomUUID()}`;

    const { createdTask, envelope } = await db.transaction(async (tx) => {
      const [t] = await tx
        .insert(tasks)
        .values({
          id: taskId,
          organizationId: ctx.project.organizationId,
          projectId,
          statusId: data.statusId,
          title: data.title,
          description: data.description,
          priority: data.priority || 'medium',
          createdBy: userId,
          assigneeId: data.assigneeId,
          parentTaskId: data.parentTaskId,
          dueAt: data.dueAt ? new Date(data.dueAt) : null,
          position: pos,
          version: 1,
        })
        .returning();

      // Log activity
      await tx.insert(taskActivities).values({
        id: `act_${crypto.randomUUID()}`,
        organizationId: ctx.project.organizationId,
        projectId,
        taskId: t.id,
        actorId: userId,
        eventType: 'task_created',
        newValue: t.title,
        metadata: { title: t.title, statusId: t.statusId },
      });

      // Notification if assigned to someone else
      if (data.assigneeId && data.assigneeId !== userId) {
        await tx.insert(notifications).values({
          id: `notif_${crypto.randomUUID()}`,
          organizationId: ctx.project.organizationId,
          recipientId: data.assigneeId,
          type: 'task_assigned',
          resourceType: 'task',
          resourceId: t.id,
          title: 'New Task Assignment',
          message: `You were assigned to task "${t.title}"`,
        });
      }

      // Record outbox event
      const env = await recordOutboxEvent(
        {
          organizationId: ctx.project.organizationId,
          projectId,
          aggregateType: 'task',
          aggregateId: t.id,
          eventType: 'task.created',
          version: t.version,
          payload: { task: t },
        },
        tx
      );

      return { createdTask: t, envelope: env };
    });

    // Asynchronously dispatch live event
    publishEvent(envelope);

    return createdTask;
  }

  static async updateTask(
    userId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      statusId?: string;
      priority?: any;
      assigneeId?: string | null;
      parentTaskId?: string | null;
      dueAt?: string | null;
      version?: number;
    }
  ) {
    const existing = await this.getTaskById(userId, taskId);
    const ctx = await ProjectService.getProjectContext(userId, existing.projectId);

    if (!permissions.canEditTask(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx, existing)) {
      throw new ForbiddenError('You do not have permission to edit this task');
    }

    // Optimistic concurrency conflict check!
    if (data.version !== undefined && data.version !== existing.version) {
      throw new ConflictError(
        `Concurrency conflict: Task has been modified by another user (expected v${data.version}, current v${existing.version}). Please refresh.`
      );
    }

    // Validate assignee if changed
    if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
      const [assigneeMem] = await db
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, existing.organizationId),
            eq(organizationMemberships.userId, data.assigneeId)
          )
        )
        .limit(1);

      if (!assigneeMem) {
        throw new BadRequestError('Assignee is not a member of this organization');
      }
    }

    // Check status change
    let completedAt = existing.completedAt;
    if (data.statusId && data.statusId !== existing.statusId) {
      const [newStatus] = await db
        .select()
        .from(workflowStatuses)
        .where(and(eq(workflowStatuses.id, data.statusId), eq(workflowStatuses.projectId, existing.projectId)))
        .limit(1);

      if (!newStatus) {
        throw new BadRequestError('Invalid workflow status for this project');
      }

      if (newStatus.category === 'completed') {
        completedAt = new Date();
      } else if (existing.completedAt) {
        completedAt = null;
      }
    }

    const { updatedTask, envelope } = await db.transaction(async (tx) => {
      const newVersion = existing.version + 1;
      const [updated] = await tx
        .update(tasks)
        .set({
          ...(data.title ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.statusId ? { statusId: data.statusId } : {}),
          ...(data.priority ? { priority: data.priority } : {}),
          ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
          ...(data.parentTaskId !== undefined ? { parentTaskId: data.parentTaskId } : {}),
          ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
          completedAt,
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.version, existing.version)))
        .returning();

      if (!updated) {
        throw new ConflictError('Concurrent edit conflict during task update');
      }

      // Record activity logs
      if (data.statusId && data.statusId !== existing.statusId) {
        await tx.insert(taskActivities).values({
          id: `act_${crypto.randomUUID()}`,
          organizationId: existing.organizationId,
          projectId: existing.projectId,
          taskId,
          actorId: userId,
          eventType: 'status_changed',
          previousValue: existing.statusId,
          newValue: data.statusId,
          metadata: { from: existing.statusId, to: data.statusId },
        });
      }
      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        await tx.insert(taskActivities).values({
          id: `act_${crypto.randomUUID()}`,
          organizationId: existing.organizationId,
          projectId: existing.projectId,
          taskId,
          actorId: userId,
          eventType: 'reassigned',
          previousValue: existing.assigneeId,
          newValue: data.assigneeId,
          metadata: { from: existing.assigneeId, to: data.assigneeId },
        });

        if (data.assigneeId && data.assigneeId !== userId) {
          await tx.insert(notifications).values({
            id: `notif_${crypto.randomUUID()}`,
            organizationId: existing.organizationId,
            recipientId: data.assigneeId,
            type: 'task_assigned',
            resourceType: 'task',
            resourceId: taskId,
            title: 'Task Assigned to You',
            message: `You were assigned to task "${updated.title}"`,
          });
        }
      }

      const env = await recordOutboxEvent(
        {
          organizationId: existing.organizationId,
          projectId: existing.projectId,
          aggregateType: 'task',
          aggregateId: taskId,
          eventType: 'task.updated',
          version: newVersion,
          payload: { task: updated },
        },
        tx
      );

      return { updatedTask: updated, envelope: env };
    });

    publishEvent(envelope);
    return updatedTask;
  }

  static async moveTask(
    userId: string,
    taskId: string,
    moveData: {
      statusId: string;
      prevTaskId?: string | null;
      nextTaskId?: string | null;
      destinationProjectId?: string | null;
      expectedVersion?: number;
    }
  ) {
    const task = await this.getTaskById(userId, taskId);
    const sourceCtx = await ProjectService.getProjectContext(userId, task.projectId);

    if (!permissions.canReorderTask(sourceCtx.orgMemCtx, sourceCtx.projCtx, sourceCtx.projMemCtx, task)) {
      throw new ForbiddenError('You do not have permission to reorder or move this task');
    }

    const targetProjectId = moveData.destinationProjectId || task.projectId;
    let targetCtx = sourceCtx;
    if (targetProjectId !== task.projectId) {
      targetCtx = await ProjectService.getProjectContext(userId, targetProjectId);
      if (targetCtx.project.organizationId !== task.organizationId) {
        throw new ForbiddenError('Cannot move tasks across different organizations');
      }
      if (!permissions.canCreateTask(targetCtx.orgMemCtx, targetCtx.projCtx, targetCtx.projMemCtx)) {
        throw new ForbiddenError('You do not have permission to add tasks to the destination project');
      }
    }

    // Concurrency conflict check
    if (moveData.expectedVersion !== undefined && moveData.expectedVersion !== task.version) {
      throw new ConflictError(
        `Move conflict: Task was modified concurrently (expected v${moveData.expectedVersion}, current v${task.version})`
      );
    }

    // Validate target status belongs to target project
    const [targetStatus] = await db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.id, moveData.statusId), eq(workflowStatuses.projectId, targetProjectId)))
      .limit(1);

    if (!targetStatus) {
      throw new BadRequestError('Destination status does not belong to the target project');
    }

    // Retrieve neighbor positions
    let prevPos: number | null = null;
    let nextPos: number | null = null;

    if (moveData.prevTaskId) {
      const [prevTask] = await db
        .select({ id: tasks.id, position: tasks.position, statusId: tasks.statusId, projectId: tasks.projectId })
        .from(tasks)
        .where(eq(tasks.id, moveData.prevTaskId))
        .limit(1);

      if (prevTask && prevTask.statusId === moveData.statusId && prevTask.projectId === targetProjectId) {
        prevPos = prevTask.position;
      }
    }

    if (moveData.nextTaskId) {
      const [nextTask] = await db
        .select({ id: tasks.id, position: tasks.position, statusId: tasks.statusId, projectId: tasks.projectId })
        .from(tasks)
        .where(eq(tasks.id, moveData.nextTaskId))
        .limit(1);

      if (nextTask && nextTask.statusId === moveData.statusId && nextTask.projectId === targetProjectId) {
        nextPos = nextTask.position;
      }
    }

    const { position: computedPos, needsRebalance } = computePosition(prevPos, nextPos);

    const { updatedTask, envelope } = await db.transaction(async (tx) => {
      let finalPosition = computedPos;

      // Handle rebalancing if spacing is compressed
      if (needsRebalance) {
        const columnTasks = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, targetProjectId),
              eq(tasks.statusId, moveData.statusId),
              sql`${tasks.id} != ${taskId}`,
              sql`${tasks.deletedAt} IS NULL`
            )
          )
          .orderBy(asc(tasks.position));

        // Reconstruct order inserting current task between prev and next
        const orderedIds: string[] = [];
        let inserted = false;
        for (const item of columnTasks) {
          if (!inserted && moveData.nextTaskId && item.id === moveData.nextTaskId) {
            orderedIds.push(taskId);
            inserted = true;
          }
          orderedIds.push(item.id);
          if (!inserted && moveData.prevTaskId && item.id === moveData.prevTaskId) {
            orderedIds.push(taskId);
            inserted = true;
          }
        }
        if (!inserted) {
          orderedIds.push(taskId);
        }

        const rebalanced = rebalancePositions(orderedIds);
        for (const rb of rebalanced) {
          if (rb.id === taskId) {
            finalPosition = rb.position;
          } else {
            await tx
              .update(tasks)
              .set({ position: rb.position })
              .where(eq(tasks.id, rb.id));
          }
        }
      }

      const newVersion = task.version + 1;
      const completedAt = targetStatus.category === 'completed' ? new Date() : (task.completedAt ? null : undefined);

      const [updated] = await tx
        .update(tasks)
        .set({
          projectId: targetProjectId,
          statusId: moveData.statusId,
          position: finalPosition,
          version: newVersion,
          ...(completedAt !== undefined ? { completedAt } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.version, task.version)))
        .returning();

      if (!updated) {
        throw new ConflictError('Concurrent move conflict: Task version was updated by another process');
      }

      // Record activity
      await tx.insert(taskActivities).values({
        id: `act_${crypto.randomUUID()}`,
        organizationId: task.organizationId,
        projectId: targetProjectId,
        taskId,
        actorId: userId,
        eventType: 'task_moved',
        previousValue: `${task.statusId}:${task.position}`,
        newValue: `${moveData.statusId}:${finalPosition}`,
        metadata: {
          fromStatusId: task.statusId,
          toStatusId: moveData.statusId,
          position: finalPosition,
        },
      });

      const env = await recordOutboxEvent(
        {
          organizationId: task.organizationId,
          projectId: targetProjectId,
          aggregateType: 'task',
          aggregateId: taskId,
          eventType: 'task.moved',
          version: newVersion,
          payload: { task: updated },
        },
        tx
      );

      return { updatedTask: updated, envelope: env };
    });

    publishEvent(envelope);
    return updatedTask;
  }

  static async deleteTask(userId: string, taskId: string) {
    const task = await this.getTaskById(userId, taskId);
    const ctx = await ProjectService.getProjectContext(userId, task.projectId);

    if (!permissions.canDeleteTask(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx, task, userId)) {
      throw new ForbiddenError('You do not have permission to delete this task');
    }

    const { envelope } = await db.transaction(async (tx) => {
      // Soft-delete
      await tx
        .update(tasks)
        .set({ deletedAt: new Date() })
        .where(eq(tasks.id, taskId));

      await tx.insert(taskActivities).values({
        id: `act_${crypto.randomUUID()}`,
        organizationId: task.organizationId,
        projectId: task.projectId,
        taskId,
        actorId: userId,
        eventType: 'task_deleted',
        newValue: 'deleted',
        metadata: { deletedAt: new Date().toISOString() },
      });

      const env = await recordOutboxEvent(
        {
          organizationId: task.organizationId,
          projectId: task.projectId,
          aggregateType: 'task',
          aggregateId: taskId,
          eventType: 'task.deleted',
          payload: { taskId, projectId: task.projectId },
        },
        tx
      );

      return { envelope: env };
    });

    publishEvent(envelope);
    return { success: true };
  }

  static async getTaskActivity(userId: string, taskId: string) {
    const task = await this.getTaskById(userId, taskId);

    const activities = await db
      .select({
        id: taskActivities.id,
        eventType: taskActivities.eventType,
        previousValue: taskActivities.previousValue,
        newValue: taskActivities.newValue,
        metadata: taskActivities.metadata,
        createdAt: taskActivities.createdAt,
        actorId: taskActivities.actorId,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(taskActivities)
      .leftJoin(users, eq(taskActivities.actorId, users.id))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt));

    return activities;
  }
}

