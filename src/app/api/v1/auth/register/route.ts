import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';
import { registerSchema } from '@/server/validation/schemas';
import { formatErrorResponse, ValidationError } from '@/server/errors/app-error';
import { setSessionCookie } from '@/server/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError('Invalid registration input', result.error.flatten().fieldErrors);
    }

    const { user, token } = await AuthService.register(result.data);

    const response = NextResponse.json({ user, token }, { status: 201 });
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}

