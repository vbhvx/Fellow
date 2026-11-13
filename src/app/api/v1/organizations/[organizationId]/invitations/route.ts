import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { createInvitationSchema } from '@/server/validation/schemas';
import { parseBody, route } from '@/server/http/route';

export const POST = route<{ organizationId: string }>(async (req, { params }) => {
  const session = await requireUser(req);
  const input = await parseBody(req, createInvitationSchema, 'Invalid invitation input');
  const { invitation, token } = await OrganizationService.inviteMember(session.userId, params.organizationId, input);
  return NextResponse.json({ invitation, token }, { status: 201 });
});
