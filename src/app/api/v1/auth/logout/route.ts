import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/server/auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

