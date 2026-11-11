-- Baseline schema. Written idempotently (IF NOT EXISTS) so databases created by the
-- pre-versioning migrate script can adopt the migration history without changes.

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 3. Organization Memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_user_unique UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS user_org_idx ON organization_memberships(user_id, organization_id);

-- 4. Organization Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_invitation_email_idx ON organization_invitations(organization_id, email);

-- 5. Projects
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(32) NOT NULL DEFAULT 'organization',
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS project_org_idx ON projects(organization_id, created_at);

-- 6. Project Memberships
CREATE TABLE IF NOT EXISTS project_memberships (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_user_unique UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS org_user_proj_idx ON project_memberships(organization_id, user_id);

-- 7. Workflow Statuses
CREATE TABLE IF NOT EXISTS workflow_statuses (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'unstarted',
  position DOUBLE PRECISION NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proj_status_key_unique UNIQUE (project_id, key)
);
CREATE INDEX IF NOT EXISTS proj_status_pos_idx ON workflow_statuses(project_id, position);

-- 8. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_id VARCHAR(64) NOT NULL REFERENCES workflow_statuses(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(32) NOT NULL DEFAULT 'medium',
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  assignee_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  parent_task_id VARCHAR(64),
  due_at TIMESTAMPTZ,
  position DOUBLE PRECISION NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS task_org_proj_idx ON tasks(organization_id, project_id);
CREATE INDEX IF NOT EXISTS task_proj_status_pos_idx ON tasks(project_id, status_id, position);
CREATE INDEX IF NOT EXISTS task_org_assignee_idx ON tasks(organization_id, assignee_id, status_id);
CREATE INDEX IF NOT EXISTS task_deleted_idx ON tasks(project_id, deleted_at);

-- 9. Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id VARCHAR(64) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id VARCHAR(64) NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS task_comment_idx ON task_comments(task_id, created_at);

-- 10. Task Activities
CREATE TABLE IF NOT EXISTS task_activities (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id VARCHAR(64) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id VARCHAR(64) REFERENCES users(id),
  event_type VARCHAR(64) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS task_activity_idx ON task_activities(task_id, created_at);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(64),
  type VARCHAR(64) NOT NULL,
  resource_type VARCHAR(32) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_notification_idx ON notifications(recipient_id, read_at, created_at);

-- 12. Collaboration Events (Durable Outbox)
CREATE TABLE IF NOT EXISTS collaboration_events (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS outbox_publish_idx ON collaboration_events(published_at, created_at);
CREATE INDEX IF NOT EXISTS outbox_org_idx ON collaboration_events(organization_id, created_at);
