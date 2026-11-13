/**
 * Response types for the browser, derived from what the services return so the client cannot
 * drift from the API. These are type-only imports: no server code reaches the client bundle.
 */
import type { AuthService } from '@/server/services/auth.service';
import type { OrganizationService } from '@/server/services/organization.service';
import type { ProjectService } from '@/server/services/project.service';
import type { WorkflowService } from '@/server/services/workflow.service';
import type { TaskService } from '@/server/services/task.service';
import type { CommentService } from '@/server/services/comment.service';
import type { NotificationService } from '@/server/services/notification.service';
import type { SearchService } from '@/server/services/search.service';

/** What a value looks like after JSON serialization: Dates become ISO strings. */
export type Jsonify<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

type Result<F extends (...args: never[]) => Promise<unknown>> = Jsonify<Awaited<ReturnType<F>>>;
type Item<F extends (...args: never[]) => Promise<unknown[]>> = Result<F>[number];

export type User = Result<typeof AuthService.getUserById>;
export type Organization = Item<typeof OrganizationService.getUserOrganizations>;
export type OrganizationDetail = Result<typeof OrganizationService.getOrganizationById>;
export type OrganizationMember = Item<typeof OrganizationService.getOrganizationMembers>;
export type Invitation = Result<typeof OrganizationService.inviteMember>;
export type ProjectSummary = Item<typeof ProjectService.getAccessibleProjects>;
export type Project = Result<typeof ProjectService.getProjectById>;
export type ProjectMember = Item<typeof ProjectService.getProjectMembers>;
export type WorkflowStatus = Item<typeof WorkflowService.getProjectStatuses>;
/** A board card. Tasks from create, move and realtime events lack the joined assignee fields. */
export type BoardTask = Item<typeof TaskService.getProjectTasks>;
export type TaskDetail = Result<typeof TaskService.getTaskById>;
export type TaskActivity = Item<typeof TaskService.getTaskActivity>;
export type Comment = Item<typeof CommentService.getTaskComments>;
export type Notification = Item<typeof NotificationService.getUserNotifications>;
export type SearchResults = Result<typeof SearchService.searchResources>;
export type TaskPriority = BoardTask['priority'];
