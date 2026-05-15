import { db } from '@/db/client';
import { notifications, tasks, projects, projectMemberships, organizationMemberships } from '@/db/schema';
import { permissions, OrgRole, ProjectRole, ProjectVisibility } from '@/server/authorization/permissions';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export class NotificationService {
  static async getUserNotifications(userId: string, organizationId?: string) {
    const conditions = [eq(notifications.recipientId, userId)];
    if (organizationId) {
      conditions.push(eq(notifications.organizationId, organizationId));
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Filter notifications to verify the recipient still has access to the underlying project!
    const verified: typeof rows = [];

    for (const notif of rows) {
      if (notif.resourceType === 'task') {
        const [task] = await db
          .select({
            id: tasks.id,
            projectId: tasks.projectId,
            organizationId: tasks.organizationId,
            deletedAt: tasks.deletedAt,
          })
          .from(tasks)
          .where(eq(tasks.id, notif.resourceId))
          .limit(1);

        if (!task || task.deletedAt) continue;

        // Verify org membership
        const [orgMem] = await db
          .select()
          .from(organizationMemberships)
          .where(
            and(
              eq(organizationMemberships.organizationId, task.organizationId),
              eq(organizationMemberships.userId, userId)
            )
          )
          .limit(1);
        if (!orgMem) continue;

        const [proj] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, task.projectId))
          .limit(1);
        if (!proj || proj.archivedAt) continue;

        const [projMem] = await db
          .select()
          .from(projectMemberships)
          .where(and(eq(projectMemberships.projectId, task.projectId), eq(projectMemberships.userId, userId)))
          .limit(1);

        const canView = permissions.canViewProject(
          { organizationId: task.organizationId, userId, role: orgMem.role as OrgRole },
          { id: proj.id, organizationId: proj.organizationId, visibility: proj.visibility as ProjectVisibility, createdBy: proj.createdBy },
          projMem ? { projectId: proj.id, userId, role: projMem.role as ProjectRole } : null
        );

        if (canView) {
          verified.push(notif);
        }
      } else {
        verified.push(notif);
      }
    }

    return verified;
  }

  static async markAsRead(userId: string, notificationId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)))
      .returning();

    return updated;
  }

  static async markAllAsRead(userId: string, organizationId?: string) {
    const conditions = [
      eq(notifications.recipientId, userId),
      sql`${notifications.readAt} IS NULL`,
    ];
    if (organizationId) {
      conditions.push(eq(notifications.organizationId, organizationId));
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(...conditions));

    return { success: true };
  }
}

