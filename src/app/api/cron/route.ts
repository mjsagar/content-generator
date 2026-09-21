import { NextResponse } from 'next/server';
import { runContentGenerationJob } from '@/lib/jobs/runner';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  // Enforce CRON_SECRET strictly
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET environment variable is missing.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/prisma/db');

  const config = await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).first();
  const intervalMinutes = config ? parseInt(config.value, 10) : 60;

  const lastRunConfig = await db.orm.public.Config.where({ key: 'LAST_CRON_RUN' }).first();
  const now = Date.now();

  if (lastRunConfig) {
    const lastRunTime = parseInt(lastRunConfig.value, 10);
    const msSinceLastRun = now - lastRunTime;
    const intervalMs = intervalMinutes * 60 * 1000;

    if (msSinceLastRun < intervalMs) {
      return NextResponse.json({ status: 'Skipped', message: `Rate limited. Next run in ${Math.round((intervalMs - msSinceLastRun)/1000/60)} mins.` });
    }

    await db.orm.public.Config.where({ key: 'LAST_CRON_RUN' }).update({ value: now.toString() });
  } else {
    await db.orm.public.Config.create({ key: 'LAST_CRON_RUN', value: now.toString() });
  }

  runContentGenerationJob().catch(console.error);

  return NextResponse.json({ status: 'Job started' });
}
