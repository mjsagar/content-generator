import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const requestUrl = host ? `${proto}://${host}` : null;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('railway.app'))
    ? process.env.NEXT_PUBLIC_SITE_URL
    : requestUrl || 'https://www.theinformationhub.uk';

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
