import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { loginSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';
import { COOKIE_NAME } from '@/server/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid login credentials', result.error.flatten().fieldErrors);
    }

    const { user, token } = await AuthService.login(result.data);

    const response = NextResponse.json({ user, token });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

