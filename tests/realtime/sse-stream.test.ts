import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as streamHandler } from '@/app/api/v1/realtime/stream/route';
import { ProjectService } from '@/server/services/project.service';
import { TaskService } from '@/server/services/task.service';
import { WorkflowService } from '@/server/services/workflow.service';
import { eventBus } from '@/server/realtime/bus';
import { pool } from '@/db/client';
import { addOrgMember, createWorkspace, sleep } from '../helpers/fixtures';

interface Frame {
  id?: string;
  event?: string;
  data?: any;
}

/** Opens the SSE route like a browser would and collects parsed frames. */
async function openStream(token: string, organizationId: string, lastEventId?: number) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (lastEventId !== undefined) headers['last-event-id'] = String(lastEventId);
  const res = await streamHandler(
    new NextRequest(`http://localhost/api/v1/realtime/stream?organizationId=${organizationId}`, { headers })
  );
  expect(res.status).toBe(200);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const frames: Frame[] = [];
  let buffer = '';
  let closed = false;

  (async () => {
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const frame: Frame = {};
        for (const line of raw.split('\n')) {
          if (line.startsWith('id: ')) frame.id = line.slice(4);
          else if (line.startsWith('event: ')) frame.event = line.slice(7);
          else if (line.startsWith('data: ')) frame.data = JSON.parse(line.slice(6));
        }
        if (frame.event) frames.push(frame);
      }
    }
    closed = true;
  })();

  return {
    frames,
    events: () => frames.filter((f) => f.id),
    isClosed: () => closed,
    close: () => reader.cancel(),
  };
}

async function currentSeq(): Promise<number> {
  const { rows } = await pool.query('SELECT COALESCE(MAX(seq), 0) AS seq FROM collaboration_events');
  return Number(rows[0].seq);
}

describe('SSE stream: live fan-out, Last-Event-ID replay, and per-project authorization', () => {
  let ws: Awaited<ReturnType<typeof createWorkspace>>;
  let member: Awaited<ReturnType<typeof addOrgMember>>;
  let privateProject: { id: string };
  let privateStatusId: string;

  beforeAll(async () => {
    ws = await createWorkspace('sse');
    member = await addOrgMember(ws.owner.id, ws.org.id, 'member');
    privateProject = await ProjectService.createProject(ws.owner.id, ws.org.id, {
      name: 'Board the member cannot see',
      visibility: 'private',
    });
    privateStatusId = (await WorkflowService.getProjectStatuses(ws.owner.id, privateProject.id))[0].id;
  });

  afterAll(async () => {
    await eventBus.stop();
  });

  it('replays missed events after Last-Event-ID, filtered by project access, in order', async () => {
    const before = await currentSeq();
    const visible = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'Public', statusId: ws.todo.id });
    const hidden = await TaskService.createTask(ws.owner.id, privateProject.id, {
      title: 'Confidential',
      statusId: privateStatusId,
    });
    await TaskService.updateTask(ws.owner.id, visible.id, { title: 'Public v2', version: 1 });

    const stream = await openStream(member.token, ws.org.id, before);
    await sleep(300);
    await stream.close();

    const replayed = stream.events();
    const resources = replayed.map((f) => f.data.resourceId);
    expect(resources).toContain(visible.id);
    expect(resources).not.toContain(hidden.id);
    expect(replayed.filter((f) => f.data.resourceId === visible.id).map((f) => f.event)).toEqual([
      'task.created',
      'task.updated',
    ]);
    const ids = replayed.map((f) => Number(f.id));
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('owners do receive private-project events', async () => {
    const before = await currentSeq();
    const hidden = await TaskService.createTask(ws.owner.id, privateProject.id, {
      title: 'Owner can see',
      statusId: privateStatusId,
    });
    const stream = await openStream(ws.owner.token, ws.org.id, before);
    await sleep(300);
    await stream.close();
    expect(stream.events().map((f) => f.data.resourceId)).toContain(hidden.id);
  });

  it('streams live events end-to-end through the database bus', async () => {
    const stream = await openStream(member.token, ws.org.id);
    expect(stream.frames[0]?.event ?? 'system.connected').toBe('system.connected');

    const task = await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'Live', statusId: ws.todo.id });
    const hidden = await TaskService.createTask(ws.owner.id, privateProject.id, {
      title: 'Live hidden',
      statusId: privateStatusId,
    });

    const deadline = Date.now() + 3000;
    while (!stream.events().some((f) => f.data.resourceId === task.id) && Date.now() < deadline) await sleep(20);
    await sleep(100);
    await stream.close();

    expect(stream.events().some((f) => f.data.resourceId === task.id)).toBe(true);
    expect(stream.events().some((f) => f.data.resourceId === hidden.id)).toBe(false);
  });

  it('rejects non-members of the organization', async () => {
    const outsider = await createWorkspace('outsider');
    const res = await streamHandler(
      new NextRequest(`http://localhost/api/v1/realtime/stream?organizationId=${ws.org.id}`, {
        headers: { authorization: `Bearer ${outsider.owner.token}` },
      })
    );
    expect(res.status).toBe(403);
  });
});
