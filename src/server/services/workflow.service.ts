import { db } from '@/db/client';
import { workflowStatuses } from '@/db/schema';
import { ProjectService } from './project.service';
import { permissions } from '@/server/authorization/permissions';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/server/errors/app-error';
import { eq, and, asc } from 'drizzle-orm';
import crypto from 'crypto';
import type { StatusCategory } from '@/server/validation/schemas';

export class WorkflowService {
  static async getProjectStatuses(userId: string, projectId: string) {
    await ProjectService.getProjectContext(userId, projectId); // throws unless the user can view the project

    const statuses = await db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.projectId, projectId))
      .orderBy(asc(workflowStatuses.position));

    return statuses;
  }

  static async createWorkflowStatus(
    userId: string,
    projectId: string,
    data: { name: string; key: string; category?: StatusCategory; position?: number; isDefault?: boolean }
  ) {
    const ctx = await ProjectService.getProjectContext(userId, projectId);
    if (!permissions.canManageWorkflow(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx)) {
      throw new ForbiddenError('You do not have permission to manage workflow statuses in this project');
    }

    const existingKey = await db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.projectId, projectId), eq(workflowStatuses.key, data.key)))
      .limit(1);

    if (existingKey.length > 0) {
      throw new BadRequestError(`Workflow status with key "${data.key}" already exists in this project`);
    }

    let pos = data.position;
    if (pos === undefined) {
      const all = await this.getProjectStatuses(userId, projectId);
      const maxPos = all.length > 0 ? Math.max(...all.map((s) => s.position)) : 0;
      pos = maxPos + 1000.0;
    }

    const [status] = await db
      .insert(workflowStatuses)
      .values({
        id: `status_${crypto.randomUUID()}`,
        organizationId: ctx.project.organizationId,
        projectId,
        name: data.name,
        key: data.key,
        category: data.category || 'unstarted',
        position: pos,
        isDefault: data.isDefault || false,
      })
      .returning();

    return status;
  }

  static async updateWorkflowStatus(
    userId: string,
    projectId: string,
    statusId: string,
    data: { name?: string; category?: StatusCategory; position?: number }
  ) {
    const ctx = await ProjectService.getProjectContext(userId, projectId);
    if (!permissions.canManageWorkflow(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx)) {
      throw new ForbiddenError('You do not have permission to manage workflow statuses in this project');
    }

    const [status] = await db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.id, statusId), eq(workflowStatuses.projectId, projectId)))
      .limit(1);

    if (!status) {
      throw new NotFoundError('Workflow status not found');
    }

    const [updated] = await db
      .update(workflowStatuses)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workflowStatuses.id, statusId))
      .returning();

    return updated;
  }
}

