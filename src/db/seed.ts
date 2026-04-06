import { runMigrations } from './migrate';
import { AuthService } from '@/server/services/auth.service';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import { TaskService } from '@/server/services/task.service';
import { WorkflowService } from '@/server/services/workflow.service';
import { CommentService } from '@/server/services/comment.service';

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');
  await runMigrations();

  // 1. Create Acme users
  const alice = (
    await AuthService.register({
      name: 'Alice Henderson',
      email: 'alice@acme.com',
      password: 'password123',
    }).catch(() => AuthService.login({ email: 'alice@acme.com', password: 'password123' }))
  ).user;

  const bob = (
    await AuthService.register({
      name: 'Bob Miller',
      email: 'bob@acme.com',
      password: 'password123',
    }).catch(() => AuthService.login({ email: 'bob@acme.com', password: 'password123' }))
  ).user;

  const charlie = (
    await AuthService.register({
      name: 'Charlie Davis',
      email: 'charlie@acme.com',
      password: 'password123',
    }).catch(() => AuthService.login({ email: 'charlie@acme.com', password: 'password123' }))
  ).user;

  // 2. Create Starlight users
  const david = (
    await AuthService.register({
      name: 'David Wright',
      email: 'david@starlight.com',
      password: 'password123',
    }).catch(() => AuthService.login({ email: 'david@starlight.com', password: 'password123' }))
  ).user;

  // 3. Create Organizations
  const acmeOrg = await OrganizationService.createOrganization(alice.id, {
    name: 'Acme Software Inc.',
    slug: 'acme-corp',
  }).catch(async () => {
    const orgs = await OrganizationService.getUserOrganizations(alice.id);
    return orgs.find((o) => o.slug === 'acme-corp') || orgs[0];
  });

  const starlightOrg = await OrganizationService.createOrganization(david.id, {
    name: 'Starlight Media',
    slug: 'starlight-media',
  }).catch(async () => {
    const orgs = await OrganizationService.getUserOrganizations(david.id);
    return orgs.find((o) => o.slug === 'starlight-media') || orgs[0];
  });

  // 4. Invite Bob and Charlie to Acme
  try {
    const inviteBob = await OrganizationService.inviteMember(alice.id, acmeOrg.id, {
      email: bob.email,
      role: 'admin',
    });
    await OrganizationService.acceptInvitation(bob.id, inviteBob.token);
  } catch {}

  try {
    const inviteCharlie = await OrganizationService.inviteMember(alice.id, acmeOrg.id, {
      email: charlie.email,
      role: 'member',
    });
    await OrganizationService.acceptInvitation(charlie.id, inviteCharlie.token);
  } catch {}

  // 5. Create Projects
  const corePlatform = await ProjectService.createProject(alice.id, acmeOrg.id, {
    name: 'Core Platform 2.0',
    description: 'Next-gen collaborative platform infrastructure with PostgreSQL outbox & SSE.',
    visibility: 'organization',
  });

  const privateProject = await ProjectService.createProject(alice.id, acmeOrg.id, {
    name: 'Q4 Board Strategy (Confidential)',
    description: 'Executive roadmap and acquisition review. Private project for leadership.',
    visibility: 'private',
  });

  const starlightApp = await ProjectService.createProject(david.id, starlightOrg.id, {
    name: 'Mobile Streaming App',
    description: 'Cross-platform iOS and Android video streaming player.',
    visibility: 'organization',
  });

  // 6. Populate Tasks in Core Platform
  const statuses = await WorkflowService.getProjectStatuses(alice.id, corePlatform.id);
  const todo = statuses.find((s) => s.key === 'todo') || statuses[0];
  const inProgress = statuses.find((s) => s.key === 'in_progress') || statuses[1];
  const done = statuses.find((s) => s.key === 'done') || statuses[statuses.length - 1];

  const t1 = await TaskService.createTask(alice.id, corePlatform.id, {
    title: 'Implement Multi-Tenant Row Scoping',
    description: 'Every query and mutation must enforce organization boundaries.',
    statusId: todo.id,
    priority: 'urgent',
    assigneeId: bob.id,
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const t2 = await TaskService.createTask(alice.id, corePlatform.id, {
    title: 'Deterministic Fractional Drag-and-Drop Reordering',
    description: 'Calculate midpoints and trigger rebalance when key gap is compressed.',
    statusId: inProgress.id,
    priority: 'high',
    assigneeId: charlie.id,
  });

  const t3 = await TaskService.createTask(bob.id, corePlatform.id, {
    title: 'Setup PostgreSQL Connection Pool',
    description: 'Configured pg.Pool with 20 connections and health check ping.',
    statusId: done.id,
    priority: 'medium',
  });

  // Add Comment
  await CommentService.createComment(
    alice.id,
    t1.id,
    'Bob, please ensure we cover cross-tenant ID tampering rejection in security tests.'
  );

  await CommentService.createComment(
    bob.id,
    t1.id,
    'Done! All tenant isolation security tests in `tests/security/tenant-isolation.test.ts` are green.'
  );

  console.log('✅ Seeding complete!');
  console.log(`
Default Accounts (Password for all: password123):
- Acme Owner:      alice@acme.com
- Acme Admin:      bob@acme.com
- Acme Member:     charlie@acme.com
- Starlight Owner: david@starlight.com
`);
}

if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

