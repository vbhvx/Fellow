import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { loginSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';
import { setSessionCookie } from '@/server/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid login credentials', result.error.flatten().fieldErrors);
    }

    const { user, token } = await AuthService.login(result.data);

    const response = NextResponse.json({ user, token });
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

