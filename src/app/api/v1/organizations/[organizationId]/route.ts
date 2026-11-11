import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { updateOrganizationSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await requireUser(req);
    const org = await OrganizationService.getOrganizationById(session.userId, params.organizationId);
    return NextResponse.json({ organization: org });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = updateOrganizationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid update input', result.error.flatten().fieldErrors);
    }

    const updated = await OrganizationService.updateOrganization(
      session.userId,
      params.organizationId,
      result.data
    );
    return NextResponse.json({ organization: updated });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

