import { db } from '@/db/client';
import { tasks, projects, workflowStatuses, users } from '@/db/schema';
import { ProjectService } from './project.service';
import { eq, and, sql, ilike, or, inArray } from 'drizzle-orm';

export class SearchService {
  static async searchResources(
    userId: string,
    organizationId: string,
    query: string,
    filters?: { projectId?: string; statusId?: string; priority?: string; assigneeId?: string }
  ) {
    // 1. Get all projects user has access to
    const accessibleProjects = await ProjectService.getAccessibleProjects(userId, organizationId);
    if (accessibleProjects.length === 0) {
      return { projects: [], tasks: [] };
    }

    const accessibleProjectIds = accessibleProjects.map((p) => p.id);

    // If specific projectId requested, check if it's in accessible list
    let targetProjectIds = accessibleProjectIds;
    if (filters?.projectId) {
      if (!accessibleProjectIds.includes(filters.projectId)) {
        return { projects: [], tasks: [] };
      }
      targetProjectIds = [filters.projectId];
    }

    const searchTerm = `%${query.trim()}%`;

    // 2. Search projects
    const matchedProjects = accessibleProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
    );

    // 3. Search tasks across accessible projects
    const taskConditions = [
      inArray(tasks.projectId, targetProjectIds),
      sql`${tasks.deletedAt} IS NULL`,
      or(ilike(tasks.title, searchTerm), ilike(tasks.description, searchTerm)),
    ];

    if (filters?.statusId) {
      taskConditions.push(eq(tasks.statusId, filters.statusId));
    }
    if (filters?.priority) {
      taskConditions.push(eq(tasks.priority, filters.priority));
    }
    if (filters?.assigneeId) {
      taskConditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    const matchedTasks = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        statusId: tasks.statusId,
        assigneeId: tasks.assigneeId,
        dueAt: tasks.dueAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assigneeName: users.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(...taskConditions))
      .limit(50);

    return {
      projects: matchedProjects,
      tasks: matchedTasks,
    };
  }
}

