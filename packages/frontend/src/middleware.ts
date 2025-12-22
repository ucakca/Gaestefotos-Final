// Temporär deaktiviert - i18n wird später vollständig implementiert
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function base64UrlToUint8Array(input: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function verifyJwtHs256(token: string, secret: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: any;
  let payload: any;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
  } catch {
    return null;
  }

  if (header?.alg !== 'HS256') return null;

  // Verify signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);
  const ok = await crypto.subtle.verify('HMAC', key, signature, data);
  if (!ok) return null;

  // Expiration (seconds since epoch)
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload?.exp === 'number' && payload.exp < now) return null;

  return payload;
}

export async function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/e', '/e2', '/i', '/s', '/s2'];
  
  const { pathname } = request.nextUrl;

  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.next();
    }

    const payload = await verifyJwtHs256(token, secret);
    if (!payload) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const role = String(payload?.role || '').toUpperCase();
    if (role !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // If public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for auth token in cookie or header (will be implemented with auth store)
  // For now, just allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
