import { describe, it, expect } from 'vitest';
import { db, pool } from '@/db/client';
import { organizationMemberships, workflowStatuses } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import { TaskService } from '@/server/services/task.service';
import { CommentService } from '@/server/services/comment.service';
import { WorkflowService } from '@/server/services/workflow.service';
import { createUser, createWorkspace } from '../helpers/fixtures';

const settled = async (promises: Promise<unknown>[]) => {
  const results = await Promise.allSettled(promises);
  return {
    ok: results.filter((r) => r.status === 'fulfilled').length,
    errors: results.flatMap((r) => (r.status === 'rejected' ? [r.reason as Error] : [])),
  };
};

async function join(ownerId: string, orgId: string, role: 'owner' | 'admin' | 'member') {
  const user = await createUser(role);
  const invite = await OrganizationService.inviteMember(ownerId, orgId, { email: user.email, role });
  await OrganizationService.acceptInvitation(user.id, invite.token);
  return user;
}

describe('invitation: pending -> accepted happens once', () => {
  it('lets only one of several people accept the same invitation concurrently', async () => {
    const ws = await createWorkspace('invite_race');
    // Repeated with fresh people each round, so the window of a read-then-write implementation is hit.
    for (let round = 0; round < 8; round++) {
      const people = await Promise.all(Array.from({ length: 4 }, (_, i) => createUser(`racer${round}_${i}`)));
      const invite = await OrganizationService.inviteMember(ws.owner.id, ws.org.id, { email: `race${round}@example.com`, role: 'member' });
      const { ok, errors } = await settled(people.map((p) => OrganizationService.acceptInvitation(p.id, invite.token)));
      expect(ok).toBe(1);
      for (const e of errors) expect(e.message).toMatch(/already been accepted/);
    }
    // The owner plus one winner per invitation.
    expect(await OrganizationService.getOrganizationMembers(ws.owner.id, ws.org.id)).toHaveLength(1 + 8);
  });

  it('answers a double submit by the same person with a clear 400, not a 500', async () => {
    const ws = await createWorkspace('invite_double');
    const user = await createUser('double');
    const first = await OrganizationService.inviteMember(ws.owner.id, ws.org.id, { email: user.email, role: 'member' });
    const second = await OrganizationService.inviteMember(ws.owner.id, ws.org.id, { email: user.email, role: 'member' });
    await OrganizationService.acceptInvitation(user.id, first.token);

    await expect(OrganizationService.acceptInvitation(user.id, second.token)).rejects.toMatchObject({
      statusCode: 400,
      message: 'You are already a member of this organization',
    });
  });
});

describe('task: deleted is final', () => {
  it('never lets an edit land on a task deleted concurrently', async () => {
    const ws = await createWorkspace('delete_race');
    for (let i = 0; i < 10; i++) {
      const task = await TaskService.createTask(ws.owner.id, ws.project.id, { title: `t${i}`, statusId: ws.todo.id });
      await settled([
        TaskService.updateTask(ws.owner.id, task.id, { title: 'edited', version: task.version }),
        TaskService.deleteTask(ws.owner.id, task.id),
      ]);
      // The bug's symptom: an update event recorded after the delete event, which would put the
      // card back on every board. Every update for this task must precede its deletion.
      const { rows } = await pool.query<{ event_type: string }>(
        'SELECT event_type FROM collaboration_events WHERE aggregate_id = $1 ORDER BY seq',
        [task.id]
      );
      const types = rows.map((r) => r.event_type);
      expect(types.at(-1)).toBe('task.deleted');
    }
  });

  it('refuses a second delete instead of logging it twice', async () => {
    const ws = await createWorkspace('delete_twice');
    const task = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'x', statusId: ws.todo.id });
    const { ok } = await settled([TaskService.deleteTask(ws.owner.id, task.id), TaskService.deleteTask(ws.owner.id, task.id)]);
    expect(ok).toBe(1);
  });
});

describe('task: completedAt follows the column, not every move', () => {
  it('keeps the completion date when a done task is reordered within Done', async () => {
    const ws = await createWorkspace('done_reorder');
    const done = ws.statuses.find((s) => s.category === 'completed')!;
    const a = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'a', statusId: ws.todo.id });
    const b = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'b', statusId: done.id });

    const movedIn = await TaskService.moveTask(ws.owner.id, a.id, { statusId: done.id, expectedVersion: a.version });
    expect(movedIn.completedAt).not.toBeNull();
    await new Promise((r) => setTimeout(r, 20));

    const reordered = await TaskService.moveTask(ws.owner.id, a.id, { statusId: done.id, nextTaskId: b.id, expectedVersion: movedIn.version });
    expect(reordered.completedAt?.getTime()).toBe(movedIn.completedAt?.getTime());

    const reopened = await TaskService.moveTask(ws.owner.id, a.id, { statusId: ws.todo.id, expectedVersion: reordered.version });
    expect(reopened.completedAt).toBeNull();
  });
});

describe('project: archived is read-only', () => {
  it('rejects writes, still serves reads, and can be unarchived', async () => {
    const ws = await createWorkspace('archived');
    const task = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'before', statusId: ws.todo.id });
    await ProjectService.updateProject(ws.owner.id, ws.project.id, { archived: true });

    const archived = { statusCode: 409, message: expect.stringMatching(/archived/) };
    await expect(TaskService.createTask(ws.owner.id, ws.project.id, { title: 'x', statusId: ws.todo.id })).rejects.toMatchObject(archived);
    await expect(TaskService.moveTask(ws.owner.id, task.id, { statusId: ws.doing.id, expectedVersion: task.version })).rejects.toMatchObject(archived);
    await expect(TaskService.updateTask(ws.owner.id, task.id, { title: 'y' })).rejects.toMatchObject(archived);
    await expect(CommentService.createComment(ws.owner.id, task.id, 'hi')).rejects.toMatchObject(archived);
    await expect(
      WorkflowService.createWorkflowStatus(ws.owner.id, ws.project.id, { name: 'QA', key: 'qa' })
    ).rejects.toMatchObject(archived);

    expect((await TaskService.getProjectTasks(ws.owner.id, ws.project.id)).length).toBe(1);

    await ProjectService.updateProject(ws.owner.id, ws.project.id, { archived: false });
    await expect(TaskService.createTask(ws.owner.id, ws.project.id, { title: 'after', statusId: ws.todo.id })).resolves.toBeDefined();
  });
});

describe('workflow: exactly one default column', () => {
  it('demotes the old default when a new default is created, even concurrently', async () => {
    const ws = await createWorkspace('defaults');
    await settled([
      WorkflowService.createWorkflowStatus(ws.owner.id, ws.project.id, { name: 'A', key: 'a', isDefault: true }),
      WorkflowService.createWorkflowStatus(ws.owner.id, ws.project.id, { name: 'B', key: 'b', isDefault: true }),
    ]);
    const defaults = await db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.projectId, ws.project.id), eq(workflowStatuses.isDefault, true)));
    expect(defaults).toHaveLength(1);
  });
});

describe('organization: always keeps an owner', () => {
  it('never lets two concurrent removals take out both owners', async () => {
    const ws = await createWorkspace('owners');
    const second = await join(ws.owner.id, ws.org.id, 'owner');

    await settled([
      OrganizationService.removeMember(ws.owner.id, ws.org.id, second.id),
      OrganizationService.removeMember(second.id, ws.org.id, ws.owner.id),
    ]);
    const owners = await db
      .select()
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.organizationId, ws.org.id), eq(organizationMemberships.role, 'owner')));
    expect(owners).toHaveLength(1);
  });

  it('does not let an admin remove an owner', async () => {
    const ws = await createWorkspace('admin_owner');
    const admin = await join(ws.owner.id, ws.org.id, 'admin');
    await join(ws.owner.id, ws.org.id, 'owner');
    await expect(OrganizationService.removeMember(admin.id, ws.org.id, ws.owner.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});
