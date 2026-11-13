import { db } from '@/db/client';
import { tasks, users } from '@/db/schema';
import { ProjectService } from './project.service';
import { eq, and, sql, ilike, or, inArray, desc, SQL } from 'drizzle-orm';
import type { SearchQuery } from '@/server/validation/schemas';

const MAX_TASK_RESULTS = 50;

// Escapes LIKE wildcards so "%" or "_" in a query match literally.
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export class SearchService {
  static async searchResources(
    userId: string,
    organizationId: string,
    query: string,
    filters?: Pick<SearchQuery, 'projectId' | 'statusId' | 'priority' | 'assigneeId'>
  ) {
    const text = query.trim();
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

    // 2. Search projects (only for a text query; filters apply to tasks)
    const needle = text.toLowerCase();
    const matchedProjects = text
      ? accessibleProjects.filter(
          (p) => p.name.toLowerCase().includes(needle) || (p.description?.toLowerCase().includes(needle) ?? false)
        )
      : [];

    // 3. Search tasks across accessible projects
    const taskConditions: (SQL | undefined)[] = [
      inArray(tasks.projectId, targetProjectIds),
      sql`${tasks.deletedAt} IS NULL`,
    ];
    if (text) {
      const pattern = likePattern(text);
      taskConditions.push(or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)));
    }

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
      .orderBy(desc(tasks.updatedAt), desc(tasks.id))
      .limit(MAX_TASK_RESULTS);

    return {
      projects: matchedProjects,
      tasks: matchedTasks,
    };
  }
}

