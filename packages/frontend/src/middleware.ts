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
  // We do not use Next.js Server Actions in this app.
  // Some clients/proxies can send Server Action requests which then cause noisy Next errors
  // (e.g. "Failed to find Server Action" and follow-up digest errors). Block them early.
  if (request.method === 'POST' && request.headers.get('next-action')) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Generate CSP nonce for this request
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: https: http: blob:`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https: wss:`,
    `media-src 'self' blob:`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
  ].join('; ');

  // Helper: attach CSP headers + nonce to any response
  function withCsp(response: NextResponse): NextResponse {
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
    return response;
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/e', '/e2', '/e3', '/i', '/s', '/s2'];
  
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') || '').toLowerCase();

  // Hard-disable legacy /admin UI on the public app domain.
  // Admin/host operations live on the dedicated dash domain.
  if (pathname.startsWith('/admin') && host.includes('app.')) {
    const url = new URL(request.url);
    url.hostname = host.replace(/^app\./, 'dash.');
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

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
      return withCsp(NextResponse.next());
    }

    const payload = await verifyJwtHs256(token, secret);
    if (!payload) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const role = String(payload?.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return withCsp(NextResponse.next());
  }
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return withCsp(NextResponse.next());
  }

  return withCsp(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
