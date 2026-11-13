import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody, parseQuery, route } from '@/server/http/route';
import { NotFoundError } from '@/server/errors/app-error';
import { likePattern } from '@/server/services/search.service';
import { TaskService } from '@/server/services/task.service';
import { GET as searchHandler } from '@/app/api/v1/search/route';
import { POST as createTaskHandler } from '@/app/api/v1/projects/[projectId]/tasks/route';
import { PUT as setProjectMemberHandler } from '@/app/api/v1/projects/[projectId]/members/[userId]/route';
import { addOrgMember, createWorkspace } from '../helpers/fixtures';

const url = (path: string) => `http://localhost:3000${path}`;
const authed = (token: string, init: { method?: string; body?: string } = {}) => ({
  ...init,
  headers: { authorization: `Bearer ${token}`, 'x-request-id': 'req_contract_test' },
});

describe('route(): one error contract for every handler', () => {
  const echo = route(async (req) => {
    const body = await parseBody(req, z.object({ n: z.number() }), 'Invalid echo input');
    return Response.json(body);
  });

  it('turns a malformed JSON body into a 400 with the request id', async () => {
    const res = await echo(new NextRequest(url('/x'), { method: 'POST', body: '{nope', headers: { 'x-request-id': 'req_abc12345' } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON', requestId: 'req_abc12345' },
    });
  });

  it('turns a schema mismatch into a 422 with field errors', async () => {
    const res = await echo(new NextRequest(url('/x'), { method: 'POST', body: JSON.stringify({ n: 'one' }) }));
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid echo input');
    expect(error.details.n).toBeDefined();
  });

  it('passes AppErrors through and hides unexpected ones behind a 500', async () => {
    const notFound = route(async () => { throw new NotFoundError('Nope'); });
    expect((await notFound(new NextRequest(url('/x')))).status).toBe(404);

    const crash = route(async () => { throw new Error('db password is hunter2'); });
    const res = await crash(new NextRequest(url('/x')));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('hunter2');
  });

  it('treats empty query parameters as absent', () => {
    const q = parseQuery(new NextRequest(url('/x?a=&b=2')), z.object({ a: z.string().optional(), b: z.string() }));
    expect(q).toEqual({ b: '2' });
  });
});

describe('search', () => {
  it('escapes LIKE wildcards', () => {
    expect(likePattern('100%_done')).toBe('%100\\%\\_done%');
  });

  describe('through the API', () => {
    let ws: Awaited<ReturnType<typeof createWorkspace>>;

    beforeAll(async () => {
      ws = await createWorkspace('search');
      await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'Ship 100% of the docs', statusId: ws.todo.id, assigneeId: ws.owner.id });
      await TaskService.createTask(ws.owner.id, ws.project.id, { title: 'Ship 1000 stickers', statusId: ws.todo.id });
    });

    const search = async (query: string) => {
      const res = await searchHandler(new NextRequest(url(`/api/v1/search?organizationId=${ws.org.id}&${query}`), authed(ws.owner.token)));
      expect(res.status).toBe(200);
      return (await res.json()) as { tasks: Array<{ title: string; assigneeId: string | null }>; projects: unknown[] };
    };

    it('matches "%" literally instead of as a wildcard', async () => {
      const { tasks } = await search('q=100%25');
      expect(tasks.map((t) => t.title)).toEqual(['Ship 100% of the docs']);
    });

    it('lists my tasks with assigneeId=me and no text query', async () => {
      const { tasks, projects } = await search('assigneeId=me');
      expect(tasks.length).toBe(1);
      expect(tasks[0].assigneeId).toBe(ws.owner.id);
      expect(projects).toEqual([]);
    });

    it('still requires organizationId', async () => {
      const res = await searchHandler(new NextRequest(url('/api/v1/search?q=x'), authed(ws.owner.token)));
      expect(res.status).toBe(422);
    });
  });
});

describe('validated inputs that used to pass straight through', () => {
  it('rejects an unknown project member role', async () => {
    const ws = await createWorkspace('roles');
    const member = await addOrgMember(ws.owner.id, ws.org.id);
    const res = await setProjectMemberHandler(
      new NextRequest(url(`/api/v1/projects/${ws.project.id}/members/${member.id}`), authed(ws.owner.token, { method: 'PUT', body: JSON.stringify({ role: 'owner' }) })),
      { params: { projectId: ws.project.id, userId: member.id } }
    );
    expect(res.status).toBe(422);
  });

  it('rejects an unknown task priority with a field error', async () => {
    const ws = await createWorkspace('priority');
    const res = await createTaskHandler(
      new NextRequest(url(`/api/v1/projects/${ws.project.id}/tasks`), authed(ws.owner.token, { method: 'POST', body: JSON.stringify({ title: 'x', statusId: ws.todo.id, priority: 'asap' }) })),
      { params: { projectId: ws.project.id } }
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.details.priority).toBeDefined();
  });
});
