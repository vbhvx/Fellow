import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerHandler } from '@/app/api/v1/auth/register/route';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { GET as meHandler } from '@/app/api/v1/me/route';
import { POST as createOrgHandler, GET as listOrgHandler } from '@/app/api/v1/organizations/route';
import { POST as createProjectHandler, GET as listProjectsHandler } from '@/app/api/v1/organizations/[organizationId]/projects/route';
import { POST as createTaskHandler, GET as listTasksHandler } from '@/app/api/v1/projects/[projectId]/tasks/route';
import { POST as moveTaskHandler } from '@/app/api/v1/tasks/[taskId]/move/route';
import { POST as addCommentHandler, GET as listCommentsHandler } from '@/app/api/v1/tasks/[taskId]/comments/route';
import { GET as searchHandler } from '@/app/api/v1/search/route';
import { GET as getProjectStatusesHandler } from '@/app/api/v1/projects/[projectId]/statuses/route';

describe('API v1 Endpoints Full Integration Test', () => {
  let token: string;
  let userId: string;
  let organizationId: string;
  let projectId: string;
  let statusTodoId: string;
  let statusProgressId: string;
  let taskId: string;

  beforeAll(async () => {
    // Register user via API
    const regReq = new NextRequest('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'API Tester',
        email: `apitester_${Date.now()}@example.com`,
        password: 'password123',
      }),
    });
    const regRes = await registerHandler(regReq);
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    token = regData.token;
    userId = regData.user.id;
  });

  it('GET /api/v1/me returns authenticated user', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/me', {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await meHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(userId);
  });

  it('POST & GET /api/v1/organizations manages organizations', async () => {
    const createReq = new NextRequest('http://localhost:3000/api/v1/organizations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'Integration Org' }),
    });
    const createRes = await createOrgHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    organizationId = createData.organization.id;

    const listReq = new NextRequest('http://localhost:3000/api/v1/organizations', {
      headers: { authorization: `Bearer ${token}` },
    });
    const listRes = await listOrgHandler(listReq);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.organizations.some((o: any) => o.id === organizationId)).toBe(true);
  });

  it('POST & GET /api/v1/organizations/:orgId/projects manages projects', async () => {
    const createReq = new NextRequest(
      `http://localhost:3000/api/v1/organizations/${organizationId}/projects`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Platform Core',
          description: 'Platform microservices and frontend',
          visibility: 'organization',
        }),
      }
    );
    const createRes = await createProjectHandler(createReq, {
      params: { organizationId },
    });
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    projectId = createData.project.id;

    // Get workflow statuses for project
    const stReq = new NextRequest(
      `http://localhost:3000/api/v1/projects/${projectId}/statuses`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const stRes = await getProjectStatusesHandler(stReq, { params: { projectId } });
    const stData = await stRes.json();
    expect(stData.statuses.length).toBeGreaterThanOrEqual(4);
    statusTodoId = stData.statuses.find((s: any) => s.key === 'todo').id;
    statusProgressId = stData.statuses.find((s: any) => s.key === 'in_progress').id;
  });

  it('POST & GET /api/v1/projects/:projectId/tasks creates and lists tasks', async () => {
    const createReq = new NextRequest(
      `http://localhost:3000/api/v1/projects/${projectId}/tasks`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Implement Multi-Tenant Isolation',
          description: 'Ensure cross-tenant isolation is enforced at every layer',
          statusId: statusTodoId,
          priority: 'urgent',
        }),
      }
    );
    const createRes = await createTaskHandler(createReq, { params: { projectId } });
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    taskId = createData.task.id;
    expect(createData.task.version).toBe(1);

    const listReq = new NextRequest(
      `http://localhost:3000/api/v1/projects/${projectId}/tasks`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const listRes = await listTasksHandler(listReq, { params: { projectId } });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.tasks.some((t: any) => t.id === taskId)).toBe(true);
  });

  it('POST /api/v1/tasks/:taskId/move moves and reorders task atomically', async () => {
    const moveReq = new NextRequest(`http://localhost:3000/api/v1/tasks/${taskId}/move`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        statusId: statusProgressId,
        expectedVersion: 1,
      }),
    });
    const moveRes = await moveTaskHandler(moveReq, { params: { taskId } });
    expect(moveRes.status).toBe(200);
    const moveData = await moveRes.json();
    expect(moveData.task.statusId).toBe(statusProgressId);
    expect(moveData.task.version).toBe(2);
  });

  it('POST & GET /api/v1/tasks/:taskId/comments adds and lists comments', async () => {
    const addReq = new NextRequest(
      `http://localhost:3000/api/v1/tasks/${taskId}/comments`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Tenant isolation unit and integration tests are all green.',
        }),
      }
    );
    const addRes = await addCommentHandler(addReq, { params: { taskId } });
    expect(addRes.status).toBe(201);

    const listReq = new NextRequest(
      `http://localhost:3000/api/v1/tasks/${taskId}/comments`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const listRes = await listCommentsHandler(listReq, { params: { taskId } });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.comments.length).toBe(1);
    expect(listData.comments[0].content).toContain('Tenant isolation');
  });

  it('GET /api/v1/search queries accessible resources within organization', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/search?organizationId=${organizationId}&q=Isolation`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const res = await searchHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tasks.some((t: any) => t.id === taskId)).toBe(true);
  });
});

