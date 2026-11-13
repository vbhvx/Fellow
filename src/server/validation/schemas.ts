import { z } from 'zod';

const priority = z.enum(['urgent', 'high', 'medium', 'low', 'none']);
const statusCategory = z.enum(['backlog', 'unstarted', 'started', 'completed', 'cancelled']);

// Auth
export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Organization
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens')
    .optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member', 'viewer', 'guest']),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// Project
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  visibility: z.enum(['organization', 'private', 'guest']).default('organization'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  visibility: z.enum(['organization', 'private', 'guest']).optional(),
  archived: z.boolean().optional(),
});

export const setProjectMemberSchema = z.object({
  role: z.enum(['lead', 'member', 'viewer']).default('member'),
});

// Workflow
export const createWorkflowStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required').max(255),
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  category: statusCategory.default('unstarted'),
  position: z.number().optional(),
  isDefault: z.boolean().default(false),
});

// Task
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().optional().nullable(),
  statusId: z.string().min(1, 'Status ID is required'),
  priority: priority.default('medium'),
  assigneeId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  position: z.number().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  statusId: z.string().optional(),
  priority: priority.optional(),
  assigneeId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  version: z.number().int().optional(), // Optimistic concurrency check
});

export const moveTaskSchema = z.object({
  statusId: z.string().min(1, 'Destination status ID is required'),
  prevTaskId: z.string().optional().nullable(),
  nextTaskId: z.string().optional().nullable(),
  destinationProjectId: z.string().optional().nullable(),
  expectedVersion: z.number().int().optional(), // Concurrency conflict detection
});

// Comments
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty').max(5000),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty').max(5000),
});

export const taskListQuerySchema = z.object({
  statusId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: priority.optional(),
});

// Notifications
export const notificationListQuerySchema = z.object({
  organizationId: z.string().optional(),
});

export const markAllNotificationsReadSchema = z.object({
  organizationId: z.string().optional(),
});

// Search
export const searchQuerySchema = z.object({
  organizationId: z.string({ error: 'Query parameter "organizationId" is required' }),
  // Optional: without q, the filters alone select tasks (e.g. assigneeId=me for "my tasks").
  q: z.string().trim().max(200).optional(),
  projectId: z.string().optional(),
  statusId: z.string().optional(),
  priority: priority.optional(),
  // "me" resolves to the signed-in user.
  assigneeId: z.string().optional(),
});

// Types shared with the services, derived from the schemas so the two cannot drift apart.
export type TaskPriority = z.infer<typeof priority>;
export type StatusCategory = z.infer<typeof statusCategory>;
export type TaskListFilters = z.infer<typeof taskListQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
