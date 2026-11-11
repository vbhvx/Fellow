import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { createOrganizationSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const orgs = await OrganizationService.getUserOrganizations(session.userId);
    return NextResponse.json({ organizations: orgs });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const result = createOrganizationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid organization input', result.error.flatten().fieldErrors);
    }

    const org = await OrganizationService.createOrganization(session.userId, result.data);
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}
