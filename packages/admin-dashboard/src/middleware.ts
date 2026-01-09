import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // We do not use Next.js Server Actions in this app.
  // Some stale clients/bots may still send POSTs with `next-action` header,
  // which leads to noisy server logs and can trigger internal Next errors.
  if (req.method === 'POST' && req.headers.get('next-action')) {
    return new NextResponse('Server Actions are not supported on this deployment.', {
      status: 400,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
