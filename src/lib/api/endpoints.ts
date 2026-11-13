/**
 * Every API call the UI makes, grouped by resource. Components call these instead of building
 * URLs, and get typed, unwrapped data back. Errors surface as ApiError (see ./client).
 */
import { apiRequest } from './client';
import type {
  BoardTask,
  Comment,
  Invitation,
  Notification,
  Organization,
  OrganizationDetail,
  OrganizationMember,
  Project,
  ProjectMember,
  ProjectSummary,
  SearchResults,
  TaskActivity,
  TaskDetail,
  User,
  WorkflowStatus,
} from './types';

const V1 = '/api/v1';
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const query = (params: Record<string, string | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  return qs.toString();
};

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<{ user: User; token: string }>(`${V1}/auth/login`, json('POST', body)),
  register: (body: { name: string; email: string; password: string }) =>
    apiRequest<{ user: User; token: string }>(`${V1}/auth/register`, json('POST', body)),
  logout: () => apiRequest<{ success: true }>(`${V1}/auth/logout`, { method: 'POST' }),
  me: () => apiRequest<{ user: User }>(`${V1}/me`).then((r) => r.user),
};

export const organizationsApi = {
  list: () => apiRequest<{ organizations: Organization[] }>(`${V1}/organizations`).then((r) => r.organizations),
  get: (orgId: string) =>
    apiRequest<{ organization: OrganizationDetail }>(`${V1}/organizations/${orgId}`).then((r) => r.organization),
  create: (body: { name: string; slug?: string }) =>
    apiRequest<{ organization: Organization }>(`${V1}/organizations`, json('POST', body)).then((r) => r.organization),
  members: (orgId: string) =>
    apiRequest<{ members: OrganizationMember[] }>(`${V1}/organizations/${orgId}/members`).then((r) => r.members),
  invite: (orgId: string, body: { email: string; role: string }) =>
    apiRequest<Invitation>(`${V1}/organizations/${orgId}/invitations`, json('POST', body)),
  removeMember: (orgId: string, userId: string) =>
    apiRequest(`${V1}/organizations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  projects: (orgId: string) =>
    apiRequest<{ projects: ProjectSummary[] }>(`${V1}/organizations/${orgId}/projects`).then((r) => r.projects),
  createProject: (orgId: string, body: { name: string; description?: string | null; visibility: string }) =>
    apiRequest<{ project: Project }>(`${V1}/organizations/${orgId}/projects`, json('POST', body)).then((r) => r.project),
};

export const projectsApi = {
  get: (projectId: string) => apiRequest<{ project: Project }>(`${V1}/projects/${projectId}`).then((r) => r.project),
  statuses: (projectId: string) =>
    apiRequest<{ statuses: WorkflowStatus[] }>(`${V1}/projects/${projectId}/statuses`).then((r) => r.statuses),
  createStatus: (projectId: string, body: { name: string; key: string; category: string }) =>
    apiRequest<{ status: WorkflowStatus }>(`${V1}/projects/${projectId}/statuses`, json('POST', body)).then((r) => r.status),
  tasks: (projectId: string) =>
    apiRequest<{ tasks: BoardTask[] }>(`${V1}/projects/${projectId}/tasks`).then((r) => r.tasks),
  createTask: (
    projectId: string,
    body: { title: string; statusId: string; priority: string; assigneeId: string | null }
  ) => apiRequest<{ task: BoardTask }>(`${V1}/projects/${projectId}/tasks`, json('POST', body)).then((r) => r.task),
  members: (projectId: string) =>
    apiRequest<{ members: ProjectMember[] }>(`${V1}/projects/${projectId}/members`).then((r) => r.members),
};

export const tasksApi = {
  get: (taskId: string) => apiRequest<{ task: TaskDetail }>(`${V1}/tasks/${taskId}`).then((r) => r.task),
  update: (
    taskId: string,
    body: {
      title: string;
      description: string | null;
      statusId: string;
      priority: string;
      assigneeId: string | null;
      dueAt: string | null;
      version: number;
    }
  ) => apiRequest<{ task: TaskDetail }>(`${V1}/tasks/${taskId}`, json('PATCH', body)).then((r) => r.task),
  remove: (taskId: string) => apiRequest(`${V1}/tasks/${taskId}`, { method: 'DELETE' }),
  move: (
    taskId: string,
    body: { statusId: string; prevTaskId?: string | null; nextTaskId?: string | null; expectedVersion: number }
  ) => apiRequest<{ task: BoardTask }>(`${V1}/tasks/${taskId}/move`, json('POST', body)).then((r) => r.task),
  comments: (taskId: string) =>
    apiRequest<{ comments: Comment[] }>(`${V1}/tasks/${taskId}/comments`).then((r) => r.comments),
  addComment: (taskId: string, content: string) =>
    apiRequest<{ comment: Comment }>(`${V1}/tasks/${taskId}/comments`, json('POST', { content })).then((r) => r.comment),
  activity: (taskId: string) =>
    apiRequest<{ activities: TaskActivity[] }>(`${V1}/tasks/${taskId}/activity`).then((r) => r.activities),
};

export const notificationsApi = {
  list: (organizationId: string) =>
    apiRequest<{ notifications: Notification[] }>(`${V1}/notifications?${query({ organizationId })}`).then(
      (r) => r.notifications
    ),
  markAllRead: (organizationId: string) =>
    apiRequest<{ success: true }>(`${V1}/notifications/read-all`, json('POST', { organizationId })),
};

export const searchApi = {
  search: (params: { organizationId: string; q?: string; assigneeId?: 'me' | string }, init?: RequestInit) =>
    apiRequest<SearchResults>(`${V1}/search?${query(params)}`, init),
};
