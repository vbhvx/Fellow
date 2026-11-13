import { NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { registerSchema } from '@/server/validation/schemas';
import { setSessionCookie } from '@/server/auth/session';
import { clientIp, enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';
import { parseBody, route } from '@/server/http/route';

export const POST = route(async (req) => {
  const input = await parseBody(req, registerSchema, 'Invalid registration input');
  await enforceRateLimit(RATE_LIMITS.registerPerIp, clientIp(req));

  const { user, token } = await AuthService.register(input);
  const response = NextResponse.json({ user, token }, { status: 201 });
  setSessionCookie(response, token);
  return response;
});
