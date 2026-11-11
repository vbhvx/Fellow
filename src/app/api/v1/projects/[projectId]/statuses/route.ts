import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { WorkflowService } from '@/server/services/workflow.service';
import { createWorkflowStatusSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const statuses = await WorkflowService.getProjectStatuses(session.userId, params.projectId);
    return NextResponse.json({ statuses });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = createWorkflowStatusSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid status input', result.error.flatten().fieldErrors);
    }

    const status = await WorkflowService.createWorkflowStatus(session.userId, params.projectId, result.data);
    return NextResponse.json({ status }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

