import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/guard';
import { AuthService } from '@/server/services/auth.service';
import { route } from '@/server/http/route';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const session = await requireUser(req);
  const user = await AuthService.getUserById(session.userId);
  return NextResponse.json({ user });
});
