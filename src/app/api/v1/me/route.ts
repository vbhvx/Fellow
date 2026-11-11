import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { AuthService } from '@/server/services/auth.service';
import { formatErrorResponse } from '@/server/errors/app-error';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const user = await AuthService.getUserById(session.userId);
    return NextResponse.json({ user });
  } catch (error) {
    return formatErrorResponse(error, req);
  }
}
