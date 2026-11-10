import { NextResponse } from 'next/server';
import { getBanner } from '@/data/db';

export const dynamic = 'force-dynamic';

/** Public, read-only: the currently published announcement (or null). */
export async function GET() {
  return NextResponse.json({ text: (await getBanner()) ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
