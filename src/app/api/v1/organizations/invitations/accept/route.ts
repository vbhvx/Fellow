import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { acceptInvitationSchema } from '@/server/validation/schemas';
import { clientIp, enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';
import { parseBody, route } from '@/server/http/route';

export const POST = route(async (req) => {
  const session = await requireUser(req);
  await enforceRateLimit(RATE_LIMITS.invitationAcceptPerIp, clientIp(req));
  const { token } = await parseBody(req, acceptInvitationSchema, 'Invalid token input');
  const membership = await OrganizationService.acceptInvitation(session.userId, token);
  return NextResponse.json({ success: true, membership });
});
