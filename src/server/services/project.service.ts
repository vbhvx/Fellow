import { db } from '@/db/client';
import {
  projects,
  projectMemberships,
  organizationMemberships,
  workflowStatuses,
  users,
} from '@/db/schema';
import {
  permissions,
  OrgRole,
  ProjectRole,
  ProjectVisibility,
} from '@/server/authorization/permissions';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/server/errors/app-error';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

export class ProjectService {
  static async createProject(
    userId: string,
    organizationId: string,
    data: { name: string; description?: string | null; visibility?: ProjectVisibility }
  ) {
    // 1. Check organization membership & role
    const [orgMem] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!orgMem || !permissions.canCreateProject({ organizationId, userId, role: orgMem.role as OrgRole })) {
      throw new ForbiddenError('You do not have permission to create projects in this organization');
    }

    const projectId = `proj_${crypto.randomUUID()}`;
    const visibility = data.visibility || 'organization';

    return await db.transaction(async (tx) => {
      const [proj] = await tx
        .insert(projects)
        .values({
          id: projectId,
          organizationId,
          name: data.name,
          description: data.description,
          visibility,
          createdBy: userId,
        })
        .returning();

      // Add creator as project lead
      await tx.insert(projectMemberships).values({
        id: `pm_${crypto.randomUUID()}`,
        organizationId,
        projectId: proj.id,
        userId,
        role: 'lead',
      });

      // Initialize default workflow statuses
      const defaults = [
        { name: 'Backlog', key: 'backlog', category: 'backlog', pos: 1000.0, isDefault: false },
        { name: 'To Do', key: 'todo', category: 'unstarted', pos: 2000.0, isDefault: true },
        { name: 'In Progress', key: 'in_progress', category: 'started', pos: 3000.0, isDefault: false },
        { name: 'In Review', key: 'in_review', category: 'started', pos: 4000.0, isDefault: false },
        { name: 'Done', key: 'done', category: 'completed', pos: 5000.0, isDefault: false },
      ];

      for (const st of defaults) {
        await tx.insert(workflowStatuses).values({
          id: `status_${crypto.randomUUID()}`,
          organizationId,
          projectId: proj.id,
          name: st.name,
          key: st.key,
          category: st.category as any,
          position: st.pos,
          isDefault: st.isDefault,
        });
      }

      return proj;
    });
  }

  static async getAccessibleProjects(userId: string, organizationId: string) {
    const [orgMem] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!orgMem) {
      throw new NotFoundError('Organization not found or access denied');
    }

    const allOrgProjects = await db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, organizationId), sql`${projects.archivedAt} IS NULL`));

    const userProjectMemberships = await db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.organizationId, organizationId),
          eq(projectMemberships.userId, userId)
        )
      );

    const membershipMap = new Map<string, ProjectRole>();
    for (const pm of userProjectMemberships) {
      membershipMap.set(pm.projectId, pm.role as ProjectRole);
    }

    const accessible = allOrgProjects.filter((p) => {
      const pmRole = membershipMap.get(p.id);
      const pmContext = pmRole ? { projectId: p.id, userId, role: pmRole } : null;
      return permissions.canViewProject(
        { organizationId, userId, role: orgMem.role as OrgRole },
        {
          id: p.id,
          organizationId: p.organizationId,
          visibility: p.visibility as ProjectVisibility,
          createdBy: p.createdBy,
        },
        pmContext
      );
    });

    return accessible.map((p) => ({
      ...p,
      myRole: membershipMap.get(p.id) || (['owner', 'admin'].includes(orgMem.role) ? 'lead' : 'member'),
    }));
  }

  static async getProjectContext(userId: string, projectId: string) {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const [orgMem] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, project.organizationId),
          eq(organizationMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!orgMem) {
      throw new NotFoundError('Project not found');
    }

    const [projMem] = await db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId)
        )
      )
      .limit(1);

    const orgMemCtx = { organizationId: project.organizationId, userId, role: orgMem.role as OrgRole };
    const projCtx = {
      id: project.id,
      organizationId: project.organizationId,
      visibility: project.visibility as ProjectVisibility,
      createdBy: project.createdBy,
    };
    const projMemCtx = projMem
      ? { projectId: project.id, userId, role: projMem.role as ProjectRole }
      : null;

    if (!permissions.canViewProject(orgMemCtx, projCtx, projMemCtx)) {
      throw new NotFoundError('Project not found');
    }

    return {
      project,
      orgMemCtx,
      projCtx,
      projMemCtx,
      myRole: projMem?.role || (['owner', 'admin'].includes(orgMem.role) ? 'lead' : 'member'),
    };
  }

  static async getProjectById(userId: string, projectId: string) {
    const ctx = await this.getProjectContext(userId, projectId);
    return {
      ...ctx.project,
      myRole: ctx.myRole,
    };
  }

  static async updateProject(
    userId: string,
    projectId: string,
    data: { name?: string; description?: string | null; visibility?: ProjectVisibility; archived?: boolean }
  ) {
    const ctx = await this.getProjectContext(userId, projectId);
    if (!permissions.canManageProject(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx)) {
      throw new ForbiddenError('You do not have permission to manage this project');
    }

    const [updated] = await db
      .update(projects)
      .set({
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.visibility ? { visibility: data.visibility } : {}),
        ...(data.archived !== undefined ? { archivedAt: data.archived ? new Date() : null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    return updated;
  }

  static async getProjectMembers(userId: string, projectId: string) {
    await this.getProjectContext(userId, projectId); // throws unless the user can view the project

    const rows = await db
      .select({
        id: projectMemberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: projectMemberships.role,
        joinedAt: projectMemberships.joinedAt,
      })
      .from(projectMemberships)
      .innerJoin(users, eq(projectMemberships.userId, users.id))
      .where(eq(projectMemberships.projectId, projectId));

    return rows;
  }

  static async setProjectMember(
    currentUserId: string,
    projectId: string,
    targetUserId: string,
    role: ProjectRole
  ) {
    const ctx = await this.getProjectContext(currentUserId, projectId);
    if (!permissions.canManageProject(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx)) {
      throw new ForbiddenError('You do not have permission to manage members for this project');
    }

    // Critical Isolation Requirement: Check if target user belongs to the same organization!
    const [targetOrgMem] = await db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, ctx.project.organizationId),
          eq(organizationMemberships.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetOrgMem) {
      throw new BadRequestError('User is not a member of this organization');
    }

    const [existing] = await db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, targetUserId)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(projectMemberships)
        .set({ role })
        .where(eq(projectMemberships.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(projectMemberships)
        .values({
          id: `pm_${crypto.randomUUID()}`,
          organizationId: ctx.project.organizationId,
          projectId,
          userId: targetUserId,
          role,
        })
        .returning();
      return created;
    }
  }

  static async removeProjectMember(currentUserId: string, projectId: string, targetUserId: string) {
    const ctx = await this.getProjectContext(currentUserId, projectId);
    if (!permissions.canManageProject(ctx.orgMemCtx, ctx.projCtx, ctx.projMemCtx)) {
      throw new ForbiddenError('You do not have permission to manage members for this project');
    }

    await db
      .delete(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, targetUserId)
        )
      );

    return { success: true };
  }
}

