import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '@/db/migrate';
import { AuthService } from '@/server/services/auth.service';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import { TaskService } from '@/server/services/task.service';
import { SearchService } from '@/server/services/search.service';
import { WorkflowService } from '@/server/services/workflow.service';

describe('Tenant Isolation & Boundary Security Verification', () => {
  let userAlice: { id: string; email: string };
  let userBob: { id: string; email: string };
  let userCharlie: { id: string; email: string };

  let orgA: { id: string };
  let orgB: { id: string };

  let projectA: { id: string };
  let privateProjectA: { id: string };
  let defaultStatusA: { id: string };
  let taskA: { id: string };

  beforeAll(async () => {
    await runMigrations();

    const ts = Date.now();
    // 1. Create independent users
    const aliceRes = await AuthService.register({
      name: 'Alice OrgA',
      email: `alice_${ts}@example.com`,
      password: 'password123',
    });
    userAlice = aliceRes.user;

    const bobRes = await AuthService.register({
      name: 'Bob OrgB',
      email: `bob_${ts}@example.com`,
      password: 'password123',
    });
    userBob = bobRes.user;

    const charlieRes = await AuthService.register({
      name: 'Charlie OrgA Member',
      email: `charlie_${ts}@example.com`,
      password: 'password123',
    });
    userCharlie = charlieRes.user;

    // 2. Create independent organizations
    orgA = await OrganizationService.createOrganization(userAlice.id, {
      name: `Organization Alpha ${ts}`,
    });
    orgB = await OrganizationService.createOrganization(userBob.id, {
      name: `Organization Beta ${ts}`,
    });

    // Invite Charlie to Org A as regular member
    const invite = await OrganizationService.inviteMember(userAlice.id, orgA.id, {
      email: userCharlie.email,
      role: 'member',
    });
    await OrganizationService.acceptInvitation(userCharlie.id, invite.token);

    // 3. Alice creates projects in Org A
    projectA = await ProjectService.createProject(userAlice.id, orgA.id, {
      name: 'Alpha Public Project',
      visibility: 'organization',
    });

    privateProjectA = await ProjectService.createProject(userAlice.id, orgA.id, {
      name: 'Alpha Confidential Private Project',
      visibility: 'private',
    });

    const statuses = await WorkflowService.getProjectStatuses(userAlice.id, projectA.id);
    defaultStatusA = statuses[0];

    // Alice creates task in Org A
    taskA = await TaskService.createTask(userAlice.id, projectA.id, {
      title: 'Secret Alpha Roadmap Task',
      description: 'Confidential corporate strategy details',
      statusId: defaultStatusA.id,
    });
  });

  it('verifies users can belong to multiple organizations with isolated roles', async () => {
    // Invite Bob to Org A as a Viewer
    const inviteBob = await OrganizationService.inviteMember(userAlice.id, orgA.id, {
      email: userBob.email,
      role: 'viewer',
    });
    await OrganizationService.acceptInvitation(userBob.id, inviteBob.token);

    const bobOrgA = await OrganizationService.getOrganizationById(userBob.id, orgA.id);
    expect(bobOrgA.role).toBe('viewer');

    const bobOrgB = await OrganizationService.getOrganizationById(userBob.id, orgB.id);
    expect(bobOrgB.role).toBe('owner');
  });

  it('prevents user in Org B from reading projects belonging to Org A', async () => {
    const freshUser = await AuthService.register({
      name: 'Stranger',
      email: `stranger_${Date.now()}@example.com`,
      password: 'password123',
    });

    await expect(ProjectService.getProjectById(freshUser.user.id, projectA.id)).rejects.toThrow(
      /Project not found/i
    );
  });

  it('prevents tampering with task IDs across tenants', async () => {
    // Bob is owner in Org B, but must NOT be able to view or edit Task A in Org A
    const outsider = await AuthService.register({
      name: 'Outsider',
      email: `outsider_${Date.now()}@example.com`,
      password: 'password123',
    });
    await OrganizationService.createOrganization(outsider.user.id, { name: 'Outsider Inc' });

    await expect(TaskService.getTaskById(outsider.user.id, taskA.id)).rejects.toThrow(
      /Task not found|Project not found/i
    );

    await expect(
      TaskService.updateTask(outsider.user.id, taskA.id, { title: 'Hacked Title' })
    ).rejects.toThrow();
  });

  it('strictly rejects cross-tenant task assignments', async () => {
    const outsider = await AuthService.register({
      name: 'Alien User',
      email: `alien_${Date.now()}@example.com`,
      password: 'password123',
    });

    await expect(
      TaskService.createTask(userAlice.id, projectA.id, {
        title: 'Task With Invalid Assignee',
        statusId: defaultStatusA.id,
        assigneeId: outsider.user.id,
      })
    ).rejects.toThrow(/Assignee is not a member of this organization/i);
  });

  it('enforces private project access: members cannot access private projects without explicit membership', async () => {
    // Charlie is in Org A as member, but NOT in privateProjectA memberships
    await expect(ProjectService.getProjectById(userCharlie.id, privateProjectA.id)).rejects.toThrow(
      /Project not found/i
    );

    // Alice adds Charlie to privateProjectA
    await ProjectService.setProjectMember(userAlice.id, privateProjectA.id, userCharlie.id, 'member');

    // Now Charlie can view it
    const proj = await ProjectService.getProjectById(userCharlie.id, privateProjectA.id);
    expect(proj.id).toBe(privateProjectA.id);
  });

  it('ensures search never reveals inaccessible cross-tenant or private project tasks', async () => {
    const outsider = await AuthService.register({
      name: 'Search Tester',
      email: `searcher_${Date.now()}@example.com`,
      password: 'password123',
    });
    const outsiderOrg = await OrganizationService.createOrganization(outsider.user.id, {
      name: 'Searcher Org',
    });

    const results = await SearchService.searchResources(
      outsider.user.id,
      outsiderOrg.id,
      'Confidential'
    );
    expect(results.tasks).toHaveLength(0);
    expect(results.projects).toHaveLength(0);
  });

  it('invalidates subsequent access immediately when a member is removed', async () => {
    const dave = await AuthService.register({
      name: 'Dave Soon Expelled',
      email: `dave_${Date.now()}@example.com`,
      password: 'password123',
    });

    const invite = await OrganizationService.inviteMember(userAlice.id, orgA.id, {
      email: dave.user.email,
      role: 'member',
    });
    await OrganizationService.acceptInvitation(dave.user.id, invite.token);

    // Dave can initially view Project A
    const initial = await ProjectService.getProjectById(dave.user.id, projectA.id);
    expect(initial.id).toBe(projectA.id);

    // Alice removes Dave from Org A
    await OrganizationService.removeMember(userAlice.id, orgA.id, dave.user.id);

    // Subsequent access is denied!
    await expect(ProjectService.getProjectById(dave.user.id, projectA.id)).rejects.toThrow(
      /Project not found/i
    );
  });
});

