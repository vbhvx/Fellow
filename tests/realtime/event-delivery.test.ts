import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TaskService } from '@/server/services/task.service';
import { pool } from '@/db/client';
import { processOutboxQueue, publishEvent, recordOutboxEvent } from '@/server/events/outbox';
import { encodeBusMessage, eventBus } from '@/server/realtime/bus';
import type { CollaborationEnvelope } from '@/server/realtime/broker';
import { createWorkspace, listenAsRemoteInstance, sleep, waitFor } from '../helpers/fixtures';

type Workspace = Awaited<ReturnType<typeof createWorkspace>>;

describe('Cross-instance event delivery (outbox -> Postgres NOTIFY)', () => {
  let ws: Workspace;
  let remote: Awaited<ReturnType<typeof listenAsRemoteInstance>>;

  beforeAll(async () => {
    ws = await createWorkspace('delivery');
    remote = await listenAsRemoteInstance();
  });

  afterAll(async () => {
    await remote.close();
    await eventBus.stop();
  });

  it('delivers a committed change to a separate instance and marks it published', async () => {
    const task = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'Hello', statusId: ws.todo.id });

    const [event] = await waitFor(() => {
      const events = remote.forResource(task.id);
      return events.length > 0 && events;
    });
    expect(event.type).toBe('task.created');
    expect(event.organizationId).toBe(ws.org.id);
    expect(typeof event.seq).toBe('number');

    const { rows } = await pool.query('SELECT published_at FROM collaboration_events WHERE id = $1', [event.eventId]);
    expect(rows[0].published_at).not.toBeNull();
  });

  it('emits sequence numbers in commit order for one aggregate', async () => {
    const task = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'Seq', statusId: ws.todo.id });
    await TaskService.updateTask(ws.owner.id, task.id, { title: 'Seq v2', version: 1 });
    await TaskService.moveTask(ws.owner.id, task.id, { statusId: ws.doing.id, expectedVersion: 2 });

    const events = await waitFor(() => {
      const e = remote.forResource(task.id);
      return e.length === 3 && e;
    });
    expect(events.map((e) => e.type)).toEqual(['task.created', 'task.updated', 'task.moved']);
    const seqs = events.map((e) => e.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
  });

  it('publishes exactly once when request path and several workers race for the same event', async () => {
    const envelope = await recordOutboxEvent({
      organizationId: ws.org.id,
      projectId: ws.project.id,
      aggregateType: 'task',
      aggregateId: `race_${Date.now()}`,
      eventType: 'task.updated',
      payload: {},
    });

    await Promise.all([
      publishEvent(envelope),
      processOutboxQueue(500),
      processOutboxQueue(500),
      processOutboxQueue(500),
      publishEvent(envelope),
    ]);

    await sleep(200);
    expect(remote.forResource(envelope.resourceId)).toHaveLength(1);
  });

  it('sends oversized events by reference and hydrates them on the listening side', async () => {
    await eventBus.start();
    const received: CollaborationEnvelope[] = [];
    const unsubscribe = eventBus.subscribe((e) => received.push(e));

    const description = 'x'.repeat(20_000);
    const task = await TaskService.createTask(ws.owner.id, ws.project.id, {
      title: 'Big',
      description,
      statusId: ws.todo.id,
    });

    const hydrated = await waitFor(() => received.find((e) => e.resourceId === task.id));
    unsubscribe();
    expect((hydrated.payload.task as { description: string }).description).toHaveLength(20_000);
    // Over the wire it was only a reference.
    expect(remote.messages.some((m) => m.ref === hydrated.seq)).toBe(true);
  });

  it('keeps small payloads inline', () => {
    const small = { eventId: 'e', seq: 1, type: 't', organizationId: 'o', resourceId: 'r', occurredAt: '', payload: {} };
    expect(JSON.parse(encodeBusMessage(small))).toHaveProperty('envelope');
  });
});
