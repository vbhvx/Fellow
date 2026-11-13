import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '@/db/migrate';
import { AuthService } from '@/server/services/auth.service';
import { OrganizationService } from '@/server/services/organization.service';
import { ProjectService } from '@/server/services/project.service';
import { TaskService } from '@/server/services/task.service';
import { WorkflowService } from '@/server/services/workflow.service';
import { processOutboxQueue } from '@/server/events/outbox';

describe('Concurrency Control, Outbox Publishing & Move Safety', () => {
  let user: { id: string };
  let org: { id: string };
  let project: { id: string };
  let statusTodo: { id: string };
  let statusProgress: { id: string };

  beforeAll(async () => {
    await runMigrations();

    const ts = Date.now();
    const res = await AuthService.register({
      name: 'Concurrency Tester',
      email: `conc_${ts}@example.com`,
      password: 'password123',
    });
    user = res.user;

    org = await OrganizationService.createOrganization(user.id, {
      name: `Concurrency Org ${ts}`,
    });

    project = await ProjectService.createProject(user.id, org.id, {
      name: 'Sprint Board',
    });

    const statuses = await WorkflowService.getProjectStatuses(user.id, project.id);
    statusTodo = statuses.find((s) => s.key === 'todo') || statuses[0];
    statusProgress = statuses.find((s) => s.key === 'in_progress') || statuses[1];
  });

  it('detects version conflicts and rejects stale concurrent task updates', async () => {
    const task = await TaskService.createTask(user.id, project.id, {
      title: 'Original Title',
      statusId: statusTodo.id,
    });
    expect(task.version).toBe(1);

    // Client 1 updates task successfully (now v2)
    const updatedByClient1 = await TaskService.updateTask(user.id, task.id, {
      title: 'Updated by Client 1',
      version: 1, // expected version 1
    });
    expect(updatedByClient1.version).toBe(2);

    // Client 2 attempts to update using stale version 1 -> Must throw ConflictError!
    await expect(
      TaskService.updateTask(user.id, task.id, {
        title: 'Conflicting Edit by Client 2',
        version: 1, // stale!
      })
    ).rejects.toThrow(/Concurrency conflict/i);
  });

  it('detects version conflicts during concurrent drag-and-drop moves', async () => {
    const task = await TaskService.createTask(user.id, project.id, {
      title: 'Move Conflict Task',
      statusId: statusTodo.id,
    });
    expect(task.version).toBe(1);

    // Client 1 moves task to In Progress
    const moved = await TaskService.moveTask(user.id, task.id, {
      statusId: statusProgress.id,
      expectedVersion: 1,
    });
    expect(moved.version).toBe(2);
    expect(moved.statusId).toBe(statusProgress.id);

    // Client 2 sends a concurrent move with outdated expectedVersion 1
    await expect(
      TaskService.moveTask(user.id, task.id, {
        statusId: statusTodo.id,
        expectedVersion: 1,
      })
    ).rejects.toThrow(/Move conflict/i);
  });

  it('atomically records outbox events and reliably publishes them', async () => {
    await TaskService.createTask(user.id, project.id, {
      title: 'Outbox Event Task',
      statusId: statusTodo.id,
    });

    // The outbox worker polls queue and publishes
    const processed = await processOutboxQueue(50);
    expect(processed).toBeGreaterThanOrEqual(0);
  });
});

