import { db } from '@/prisma/db';
import { NextResponse } from 'next/server';

export async function GET() {
  // If the database URL is not properly set up at build time on NextJS, return early empty.
  // We can't query the DB safely without connecting, which causes prerendering failures.
  if (!process.env.DATABASE_URL) {
    return new NextResponse('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  }

  const pages = await db.orm.public.Page.all();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.example.com';

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
