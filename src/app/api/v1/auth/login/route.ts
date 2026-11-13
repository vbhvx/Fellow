import { NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { loginSchema } from '@/server/validation/schemas';
import { setSessionCookie } from '@/server/auth/session';
import { clientIp, enforceRateLimit, RATE_LIMITS } from '@/server/security/rate-limit';
import { parseBody, route } from '@/server/http/route';

export const POST = route(async (req) => {
  const input = await parseBody(req, loginSchema, 'Invalid login credentials');

  await enforceRateLimit(RATE_LIMITS.loginPerIp, clientIp(req));
  await enforceRateLimit(RATE_LIMITS.loginPerAccount, input.email.toLowerCase());

  const { user, token } = await AuthService.login(input);
  const response = NextResponse.json({ user, token });
  setSessionCookie(response, token);
  return response;
});
