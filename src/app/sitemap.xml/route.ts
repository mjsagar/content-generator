import { db } from '@/prisma/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const requestUrl = host ? `${proto}://${host}` : null;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('railway.app'))
    ? process.env.NEXT_PUBLIC_SITE_URL
    : requestUrl || 'https://www.theinformationhub.uk';
  let pages: any[] = [];

  try {
    if (process.env.DATABASE_URL) {
      pages = await db.orm.public.Page.all();
    }
  } catch (err) {
    console.warn('Could not query pages for sitemap:', err);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${pages.map((page: any) => `
  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${new Date(page.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`;

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
