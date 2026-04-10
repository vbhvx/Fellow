import { NextRequest } from 'next/server';
import { getSessionFromRequest, SessionPayload } from './session';
import { UnauthorizedError } from '@/server/errors/app-error';

export async function requireUser(request: NextRequest): Promise<SessionPayload> {
  const user = await getSessionFromRequest(request);
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}

