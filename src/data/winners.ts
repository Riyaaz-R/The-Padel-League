import 'server-only';
import { anonClient } from './db';

export interface Winner { week: number; name: string; caption?: string; photoUrl?: string; announcedAt: string }

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const photoUrl = (path: string) => `${BASE}/storage/v1/object/public/lucky-draw/${path}`;

/** Weekly Lucky Draw winners for the active season (public data). */
export async function loadWinners(): Promise<Winner[]> {
  try {
    const { data, error } = await anonClient().from('lucky_draw_winners').select('week, winner_name, caption, photo_path, announced_at').order('week');
    if (error) return [];
    return (data ?? []).map((w) => ({ week: w.week, name: w.winner_name, caption: w.caption ?? undefined, photoUrl: w.photo_path ? photoUrl(w.photo_path) : undefined, announcedAt: w.announced_at }));
  } catch { return []; }
}
