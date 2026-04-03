import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Organizations
export const organizations = pgTable('organizations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  createdBy: varchar('created_by', { length: 64 })
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

// 3. Organization Memberships
export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id', { length: 64 })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 32 }).notNull(), // 'owner' | 'admin' | 'member' | 'viewer' | 'guest'
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex('org_user_idx').on(table.organizationId, table.userId),
    userOrgIdx: index('user_org_idx').on(table.userId, table.organizationId),
  })
);

// 4. Organization Invitations
export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 32 }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 64 })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgEmailIdx: index('org_invitation_email_idx').on(table.organizationId, table.email),
  })
);

// 5. Projects
export const projects = pgTable(
  'projects',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    visibility: varchar('visibility', { length: 32 }).default('organization').notNull(), // 'organization' | 'private' | 'guest'
    createdBy: varchar('created_by', { length: 64 })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => ({
    orgProjectIdx: index('project_org_idx').on(table.organizationId, table.createdAt),
  })
);

// 6. Project Memberships
export const projectMemberships = pgTable(
  'project_memberships',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: varchar('project_id', { length: 64 })
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id', { length: 64 })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 32 }).default('member').notNull(), // 'lead' | 'member' | 'viewer'
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectUserIdx: uniqueIndex('project_user_idx').on(table.projectId, table.userId),
    orgUserProjIdx: index('org_user_proj_idx').on(table.organizationId, table.userId),
  })
);

// 7. Workflow Statuses
export const workflowStatuses = pgTable(
  'workflow_statuses',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: varchar('project_id', { length: 64 })
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    key: varchar('key', { length: 64 }).notNull(),
    category: varchar('category', { length: 32 }).default('unstarted').notNull(), // 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'
    position: doublePrecision('position').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projStatusKeyIdx: uniqueIndex('proj_status_key_idx').on(table.projectId, table.key),
    projStatusPosIdx: index('proj_status_pos_idx').on(table.projectId, table.position),
  })
);

// 8. Tasks
export const tasks = pgTable(
  'tasks',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: varchar('project_id', { length: 64 })
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    statusId: varchar('status_id', { length: 64 })
      .references(() => workflowStatuses.id)
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    priority: varchar('priority', { length: 32 }).default('medium').notNull(), // 'urgent' | 'high' | 'medium' | 'low' | 'none'
    createdBy: varchar('created_by', { length: 64 })
      .references(() => users.id)
      .notNull(),
    assigneeId: varchar('assignee_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
    parentTaskId: varchar('parent_task_id', { length: 64 }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    position: doublePrecision('position').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    taskOrgProjIdx: index('task_org_proj_idx').on(table.organizationId, table.projectId),
    taskProjStatusPosIdx: index('task_proj_status_pos_idx').on(table.projectId, table.statusId, table.position),
    taskOrgAssigneeIdx: index('task_org_assignee_idx').on(table.organizationId, table.assigneeId, table.statusId),
    taskDeletedIdx: index('task_deleted_idx').on(table.projectId, table.deletedAt),
  })
);

// 9. Task Comments
export const taskComments = pgTable(
  'task_comments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: varchar('project_id', { length: 64 })
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    taskId: varchar('task_id', { length: 64 })
      .references(() => tasks.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: varchar('author_id', { length: 64 })
      .references(() => users.id)
      .notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    taskCommentIdx: index('task_comment_idx').on(table.taskId, table.createdAt),
  })
);

// 10. Task Activities
export const taskActivities = pgTable(
  'task_activities',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: varchar('project_id', { length: 64 })
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    taskId: varchar('task_id', { length: 64 })
      .references(() => tasks.id, { onDelete: 'cascade' })
      .notNull(),
    actorId: varchar('actor_id', { length: 64 }).references(() => users.id),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    previousValue: text('previous_value'),
    newValue: text('new_value'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    taskActivityIdx: index('task_activity_idx').on(table.taskId, table.createdAt),
  })
);

// 11. Notifications
export const notifications = pgTable(
  'notifications',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 })
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    recipientId: varchar('recipient_id', { length: 64 })
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    eventId: varchar('event_id', { length: 64 }),
    type: varchar('type', { length: 64 }).notNull(), // 'task_assigned', 'task_updated', 'comment_added', 'invited', etc.
    resourceType: varchar('resource_type', { length: 32 }).notNull(), // 'task', 'project'
    resourceId: varchar('resource_id', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userNotificationIdx: index('user_notification_idx').on(table.recipientId, table.readAt, table.createdAt),
  })
);

// 12. Collaboration Events (Durable Outbox)
export const collaborationEvents = pgTable(
  'collaboration_events',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 64 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 64 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').default(0).notNull(),
  },
  (table) => ({
    outboxPublishIdx: index('outbox_publish_idx').on(table.publishedAt, table.createdAt),
    outboxOrgIdx: index('outbox_org_idx').on(table.organizationId, table.createdAt),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMemberships),
  projectMemberships: many(projectMemberships),
  createdTasks: many(tasks, { relationName: 'taskCreator' }),
  assignedTasks: many(tasks, { relationName: 'taskAssignee' }),
  comments: many(taskComments),
  notifications: many(notifications),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(organizationMemberships),
  invitations: many(organizationInvitations),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  memberships: many(projectMemberships),
  workflowStatuses: many(workflowStatuses),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  status: one(workflowStatuses, {
    fields: [tasks.statusId],
    references: [workflowStatuses.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: 'taskCreator',
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'taskAssignee',
  }),
  comments: many(taskComments),
  activities: many(taskActivities),
}));
