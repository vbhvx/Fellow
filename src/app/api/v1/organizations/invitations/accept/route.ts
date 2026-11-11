import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { OrganizationService } from '@/server/services/organization.service';
import { acceptInvitationSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';
import { clientIp, enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    await enforceRateLimit(RATE_LIMITS.invitationAcceptPerIp, clientIp(req));
    const body = await req.json();
    const result = acceptInvitationSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid token input', result.error.flatten().fieldErrors);
    }

    const membership = await OrganizationService.acceptInvitation(session.userId, result.data.token);
    return NextResponse.json({ success: true, membership });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

