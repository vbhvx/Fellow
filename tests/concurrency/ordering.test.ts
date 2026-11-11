import { describe, it, expect, beforeAll } from 'vitest';
import { TaskService } from '@/server/services/task.service';
import { createWorkspace } from '../helpers/fixtures';

type Workspace = Awaited<ReturnType<typeof createWorkspace>>;

describe('Board ordering under concurrent writers', () => {
  let ws: Workspace;

  beforeAll(async () => {
    ws = await createWorkspace('ordering');
  });

  const columnPositions = async (statusId: string) =>
    (await TaskService.getProjectTasks(ws.owner.id, ws.project.id, { statusId })).map((t) => t.position);

  it('gives every concurrently created task a distinct position', async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        TaskService.createTask(ws.owner.id, ws.project.id, { title: `Parallel ${i}`, statusId: ws.todo.id })
      )
    );

    const positions = await columnPositions(ws.todo.id);
    expect(positions).toHaveLength(12);
    expect(new Set(positions).size).toBe(12);
  });

  it('does not collide when several cards are appended to the same column at once', async () => {
    const tasks = await TaskService.getProjectTasks(ws.owner.id, ws.project.id, { statusId: ws.todo.id });

    await Promise.all(
      tasks.slice(0, 6).map((t) =>
        TaskService.moveTask(ws.owner.id, t.id, { statusId: ws.doing.id, expectedVersion: t.version })
      )
    );

    const positions = await columnPositions(ws.doing.id);
    expect(positions).toHaveLength(6);
    expect(new Set(positions).size).toBe(6);
  });

  it('keeps both cards when two users drop into the same slot simultaneously', async () => {
    const column = await TaskService.getProjectTasks(ws.owner.id, ws.project.id, { statusId: ws.doing.id });
    const [first, second] = column;
    const movers = (await TaskService.getProjectTasks(ws.owner.id, ws.project.id, { statusId: ws.todo.id })).slice(0, 2);

    // Both clients saw `first` and `second` as neighbours and computed the same gap.
    await Promise.all(
      movers.map((t) =>
        TaskService.moveTask(ws.owner.id, t.id, {
          statusId: ws.doing.id,
          prevTaskId: first.id,
          nextTaskId: second.id,
          expectedVersion: t.version,
        })
      )
    );

    const after = await TaskService.getProjectTasks(ws.owner.id, ws.project.id, { statusId: ws.doing.id });
    const positions = after.map((t) => t.position);
    expect(new Set(positions).size).toBe(positions.length);

    // Both dropped cards landed between `first` and `second`.
    const ids = after.map((t) => t.id);
    const between = ids.slice(ids.indexOf(first.id) + 1, ids.indexOf(second.id));
    expect(between.sort()).toEqual(movers.map((m) => m.id).sort());
  });
});
