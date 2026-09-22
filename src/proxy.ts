import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Only secure it if the user has explicitly requested security by setting a password
    if (adminPassword) {
      const basicAuth = request.headers.get('authorization');

      if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        if (authValue) {
          const [user = '', pwd = ''] = atob(authValue).split(':');

          const expectedUser = process.env.ADMIN_USERNAME || 'admin';

          const userBuffer = Buffer.from(user);
          const expectedUserBuffer = Buffer.from(expectedUser);
          const pwdBuffer = Buffer.from(pwd);
          const expectedPwdBuffer = Buffer.from(adminPassword);

          let userMatch = false;
          let pwdMatch = false;

          if (userBuffer.length === expectedUserBuffer.length) {
            userMatch = timingSafeEqual(userBuffer, expectedUserBuffer);
          } else {
            // Mitigate timing attacks on length by doing a dummy comparison
            timingSafeEqual(expectedUserBuffer, expectedUserBuffer);
          }

          if (pwdBuffer.length === expectedPwdBuffer.length) {
            pwdMatch = timingSafeEqual(pwdBuffer, expectedPwdBuffer);
          } else {
            // Mitigate timing attacks on length by doing a dummy comparison
            timingSafeEqual(expectedPwdBuffer, expectedPwdBuffer);
          }

          if (userMatch && pwdMatch) {
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
