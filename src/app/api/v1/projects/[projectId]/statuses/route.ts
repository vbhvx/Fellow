import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { WorkflowService } from '@/server/services/workflow.service';
import { createWorkflowStatusSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

type Params = { projectId: string };

export const GET = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const statuses = await WorkflowService.getProjectStatuses(session.userId, params.projectId);
  return NextResponse.json({ statuses });
});

export const POST = route<Params>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, createWorkflowStatusSchema, 'Invalid status input');
  const status = await WorkflowService.createWorkflowStatus(session.userId, params.projectId, input);
  return NextResponse.json({ status }, { status: 201 });
});
