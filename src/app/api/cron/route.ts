import { NextResponse } from 'next/server';
import { runContentGenerationJob } from '@/lib/jobs/runner';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  // Enforce CRON_SECRET strictly
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET environment variable is missing.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
  let isAuthorized = false;

  if (authHeader) {
    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedHeader);

    if (authBuffer.byteLength === expectedBuffer.byteLength) {
      isAuthorized = crypto.timingSafeEqual(authBuffer, expectedBuffer);
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/prisma/db');
  const { getTopicImage } = await import('@/lib/services/image');

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 're-resolve-images') {
    const allPages = await db.orm.public.Page.all();
    const seenImages = new Set<string>();
    const results = [];
    for (const page of allPages) {
      const freshImage = await getTopicImage(page.title, page.type, seenImages);
      seenImages.add(freshImage);

      const imgMatch = page.content.match(/<img[^>]+src="([^">]+)"/);
      let newContent = page.content;
      if (imgMatch) {
        newContent = newContent.replace(imgMatch[1], freshImage);
      } else {
        newContent = `<img src="${freshImage}" alt="${page.title}" class="w-full h-auto rounded-2xl shadow-lg mb-8" />\n` + newContent;
      }
      await db.orm.public.Page.where({ id: page.id }).update({ content: newContent });
      results.push({ slug: page.slug, title: page.title, image: freshImage });
    }
    return NextResponse.json({ status: 'Images re-resolved', count: results.length, results });
  }

  const config = await db.orm.public.Config.where({ key: 'GENERATION_INTERVAL_MINUTES' }).first();
  const intervalMinutes = config ? parseInt(config.value, 10) : 60;

  const lastRunConfig = await db.orm.public.Config.where({ key: 'LAST_CRON_RUN' }).first();
  const now = Date.now();

  const force = url.searchParams.get('force') === 'true';

  if (!force && lastRunConfig) {
    const lastRunTime = parseInt(lastRunConfig.value, 10);
    const msSinceLastRun = now - lastRunTime;
    const intervalMs = intervalMinutes * 60 * 1000;

    if (msSinceLastRun < intervalMs) {
      return NextResponse.json({ status: 'Skipped', message: `Rate limited. Next run in ${Math.round((intervalMs - msSinceLastRun)/1000/60)} mins. Add ?force=true to override.` });
    }

    await db.orm.public.Config.where({ key: 'LAST_CRON_RUN' }).update({ value: now.toString() });
  } else if (lastRunConfig) {
    await db.orm.public.Config.where({ key: 'LAST_CRON_RUN' }).update({ value: now.toString() });
  } else {
    await db.orm.public.Config.create({ key: 'LAST_CRON_RUN', value: now.toString() });
  }

  runContentGenerationJob().catch(console.error);

  return NextResponse.json({ status: 'Job started' });
}

export { GET as POST };
