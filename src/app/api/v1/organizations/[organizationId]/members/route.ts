import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export async function GET(
  req: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const session = await requireUser(req);
    const members = await OrganizationService.getOrganizationMembers(session.userId, params.organizationId);
    return NextResponse.json({ members });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

