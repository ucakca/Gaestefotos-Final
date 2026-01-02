import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'cache-control': 'public, max-age=86400',
    },
  });
}
