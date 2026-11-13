import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { route } from '@/server/http/route';

export const GET = route<{ organizationId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  const members = await OrganizationService.getOrganizationMembers(session.userId, params.organizationId);
  return NextResponse.json({ members });
});
