import { NextResponse } from 'next/server';
import { pool } from '@/db/client';

export async function GET() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        realtime: 'ready',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}

