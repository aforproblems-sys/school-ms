import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVersionInfo } from '@/lib/version';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'ok' | 'degraded' | 'error' = 'error';
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStartTime;
    dbStatus = 'ok';
  } catch (err: unknown) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : 'Database connectivity check failed';
  }

  const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded';
  const statusCode = dbStatus === 'ok' ? 200 : 503;

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: getVersionInfo().version,
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - startTime,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError && process.env.NODE_ENV !== 'production' ? { error: dbError } : {}),
      },
      storage: {
        status: 'ok',
        provider: process.env.STORAGE_PROVIDER || 'local',
      },
    },
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };

  return NextResponse.json(healthData, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  });
}
