import { NextResponse } from 'next/server';
import { snapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

/** Public, read-only snapshot polled by /live and /tv (swapped for Supabase Realtime once connected). */
export async function GET() {
  return NextResponse.json(await snapshot(), { headers: { 'Cache-Control': 'no-store' } });
}
