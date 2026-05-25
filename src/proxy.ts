import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/_next',
  '/icon',
  '/apple-icon',
  '/manifest.webmanifest',
  '/sw.js',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスルー
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const auth = await verifyToken(token);
  if (!auth) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('auth-token');
    return res;
  }

  // SuperAdmin は /super-admin のみアクセス可（他ページはホームへ）
  if (auth.tenantId === '__super__' && !pathname.startsWith('/super-admin') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  // storeId が確定していない store_staff はエラー
  if (auth.role === 'store_staff' && !auth.storeId) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('auth-token');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
