import { NextResponse } from 'next/server';

const STARTED_AT = new Date().toISOString();

export function GET() {
  return NextResponse.json({
    service: 'frontend',
    version: '2.0.0',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    nextDistDir: process.env.NEXT_DIST_DIR || '.next',
    startedAt: STARTED_AT,
  });
}
