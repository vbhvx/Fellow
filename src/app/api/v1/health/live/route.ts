import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Liveness: the process is up and serving. Deliberately touches no dependencies so a database
// outage doesn't make an orchestrator restart healthy app containers.
export async function GET() {
  return NextResponse.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
}
