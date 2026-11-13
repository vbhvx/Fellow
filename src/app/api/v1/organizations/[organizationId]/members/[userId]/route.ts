import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { route } from '@/server/http/route';

export const DELETE = route<{ organizationId: string; userId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  await OrganizationService.removeMember(session.userId, params.organizationId, params.userId);
  return NextResponse.json({ success: true, message: 'Member removed successfully' });
});
