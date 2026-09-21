import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Only secure it if the user has explicitly requested security by setting a password
    if (adminPassword) {
      const basicAuth = request.headers.get('authorization');

      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        if (authValue) {
          const [user, pwd] = atob(authValue).split(':');
          if (user === 'admin' && pwd === adminPassword) {
            return NextResponse.next();
          }
        }
      }

      return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
