import { NextResponse } from 'next/server';
import { loadBanner } from '@/data/sponsors';

export const dynamic = 'force-dynamic';

/** Public, read-only: the banner settings and the items that are active today (enforced by row-level security). */
export async function GET() {
  return NextResponse.json(await loadBanner(), { headers: { 'Cache-Control': 'no-store' } });
}
