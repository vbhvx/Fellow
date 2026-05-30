import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/server/auth/session';

export default async function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const user = await verifySessionToken(token);
    if (user) {
      redirect('/dashboard');
    }
  }

  redirect('/login');
}

