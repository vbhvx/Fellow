// Runs once per server instance at boot. Misconfiguration should fail the deploy, not the first
// request: Next.js would otherwise keep the process up and answer every request with a 500.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { getEnv } = await import('@/server/config/env');
  try {
    getEnv();
  } catch (err) {
    console.error((err as Error).message);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    throw err;
  }
}
