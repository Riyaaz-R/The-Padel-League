import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { PairingResult, SetScore, TbScore } from '@/domain/types';
import { TEAMS } from './seed';
import { registerTeams } from './team-store';
import { resolveLogo, storageUrl } from '@/lib/media';
import { SLOT_ORDER } from '@/domain/knockout';
import { emptyPairings, type AppState, type FixtureState, type FixtureStatus, type PlayerRow, type TeamRow } from './store';
import type { Slot } from '@/domain/knockout';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const dbConfigured = () => Boolean(URL && KEY);

/** Public, read-only client (anon role, RLS applies). */
export function anonClient(): SupabaseClient {
  return createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Client acting as the signed-in staff member (cookie session). Writes are checked by RLS, so no service key is needed. */
export async function userClient(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { for (const { name, value, options } of list) jar.set(name, value, options); } catch { /* called from a Server Component: refresh handled by middleware */ } },
    },
  });
}

type One<T> = T | T[] | null | undefined;
const one = <T,>(v: One<T>): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);
const tbOf = (h: number | null, a: number | null): TbScore | undefined => (h === null || a === null ? undefined : { h, a });

interface ResultRow {
  s1_h: number; s1_a: number; s1_tb_h: number | null; s1_tb_a: number | null; s2_h: number; s2_a: number; s2_tb_h: number | null; s2_tb_a: number | null;
  mtb_h: number | null; mtb_a: number | null; outcome: PairingResult['outcome']; forced_s1: boolean; forced_s2: boolean;
}
export function rowToResult(r: ResultRow): PairingResult {
  const set = (h: number, a: number, th: number | null, ta: number | null, forced: boolean): SetScore => ({ h, a, ...(tbOf(th, ta) ? { tb: tbOf(th, ta) } : {}), ...(forced ? { forced: true } : {}) });
  return { set1: set(r.s1_h, r.s1_a, r.s1_tb_h, r.s1_tb_a, r.forced_s1), set2: set(r.s2_h, r.s2_a, r.s2_tb_h, r.s2_tb_a, r.forced_s2), mtb: tbOf(r.mtb_h, r.mtb_a), outcome: r.outcome };
}
export function resultToRow(pairingId: string, r: PairingResult, points: { home: number; away: number }) {
  return {
    pairing_id: pairingId, s1_h: r.set1.h, s1_a: r.set1.a, s1_tb_h: r.set1.tb?.h ?? null, s1_tb_a: r.set1.tb?.a ?? null, forced_s1: Boolean(r.set1.forced),
    s2_h: r.set2.h, s2_a: r.set2.a, s2_tb_h: r.set2.tb?.h ?? null, s2_tb_a: r.set2.tb?.a ?? null, forced_s2: Boolean(r.set2.forced),
    mtb_h: r.mtb?.h ?? null, mtb_a: r.mtb?.a ?? null, outcome: r.outcome ?? 'normal', home_points: points.home, away_points: points.away,
  };
}

/** The published announcement banner text, if any (cheap single query used on every page). */
export async function getBanner(): Promise<string | undefined> {
  try {
    const { data } = await anonClient().from('announcements').select('body, expires_at').order('created_at', { ascending: false }).limit(1);
    const a = data?.[0];
    return a && (!a.expires_at || new Date(a.expires_at) > new Date()) ? a.body : undefined;
  } catch { return undefined; }
}

/** Loads the active season for one request. Public data only (anon role). `loadState` is cached per request; use `loadStateFresh` after writes. */
export const loadState = cache(() => loadStateFresh());
export async function loadStateFresh(): Promise<AppState> {
  const db = anonClient();
  const season = await db.from('seasons').select('id, settings').eq('status', 'active').order('number', { ascending: false }).limit(1).single();
  if (season.error) throw new Error(`Could not load season: ${season.error.message}`);
  const sid = season.data.id as string;
  const [teams, groups, fixtures, players, sanctions, ann] = await Promise.all([
    db.from('teams').select('id, slug, name, short, logo_path, colour, group_id').eq('season_id', sid),
    db.from('groups').select('id, name').eq('season_id', sid),
    db.from('fixtures').select('*, pairings(*, pairing_results(*), live_pairing_state(*))').eq('season_id', sid).order('week').order('created_at'),
    db.from('public_players').select('id, team_id, division, display_name, photo_path').eq('season_id', sid),
    db.from('sanctions').select('team_id, points, reason').eq('season_id', sid).eq('kind', 'point_penalty'),
    db.from('announcements').select('body, expires_at').eq('season_id', sid).order('created_at', { ascending: false }).limit(1),
  ]);
  for (const r of [teams, groups, fixtures, players, sanctions, ann]) if (r.error) throw new Error(r.error.message);

  const slugOf = new Map((teams.data ?? []).map((t) => [t.id as string, t.slug as string]));
  const teamUuid = Object.fromEntries((teams.data ?? []).map((t) => [t.slug as string, t.id as string]));
  const groupName = new Map((groups.data ?? []).map((g) => [g.id as string, g.name as 'A' | 'B']));
  const groupUuid = Object.fromEntries((groups.data ?? []).map((g) => [g.name as string, g.id as string]));

  const playerRows: PlayerRow[] = (players.data ?? []).map((p) => ({ id: p.id, name: p.display_name, teamId: slugOf.get(p.team_id) ?? '', division: p.division, ...(p.photo_path ? { photoUrl: storageUrl('player-photos', p.photo_path) } : {}) }));
  const seedIdx = (slug: string) => { const i = TEAMS.findIndex((t) => t.id === slug); return i < 0 ? 999 : i; };
  const teamRows: TeamRow[] = (teams.data ?? []).map((t) => ({ id: t.slug, uuid: t.id, name: t.name, short: t.short, logo: resolveLogo(t.logo_path), colour: t.colour ?? undefined, group: t.group_id ? groupName.get(t.group_id) : undefined }))
    .sort((a, b) => (a.group ?? 'Z').localeCompare(b.group ?? 'Z') || seedIdx(a.id) - seedIdx(b.id) || a.name.localeCompare(b.name));
  registerTeams(teamRows);

  const fx: FixtureState[] = (fixtures.data ?? []).map((f) => {
    const pairings = emptyPairings();
    for (const p of (f.pairings ?? []) as Record<string, unknown>[]) {
      const slot = p.slot as keyof typeof pairings;
      const res = one(p.pairing_results as One<ResultRow>);
      const live = one(p.live_pairing_state as One<{ set_no: number; games_h: number; games_a: number; tiebreak: boolean; serving: string | null; updated_at: string }>);
      pairings[slot] = {
        homePlayers: [p.home_p1, p.home_p2].filter(Boolean) as string[], awayPlayers: [p.away_p1, p.away_p2].filter(Boolean) as string[],
        ...(res ? { result: rowToResult(res) } : {}),
        ...(live ? { live: { setNo: live.set_no as 1 | 2 | 3, gamesH: live.games_h, gamesA: live.games_a, tiebreak: live.tiebreak, updatedAt: live.updated_at } } : {}),
      };
    }
    return {
      id: f.id, round: f.round, slot: (f.slot ?? undefined) as Slot | undefined, week: f.week, group: f.group_id ? groupName.get(f.group_id) : undefined,
      home: slugOf.get(f.home_team) ?? '', away: slugOf.get(f.away_team) ?? '', date: f.match_date, time: f.start_time ?? undefined, court: f.court ?? undefined,
      status: f.status as FixtureStatus, pairings, decidingWinner: f.deciding_winner ?? undefined, version: f.version, correctedAt: f.corrected_at ?? undefined,
    };
  });

  // stable display order: week, group stage before knockouts, then the poster order of the home team
  const teamIdx = (id: string) => teamRows.findIndex((t) => t.id === id);
  fx.sort((a, b) => a.week - b.week || Number(a.round !== 'group') - Number(b.round !== 'group') || (a.slot ? SLOT_ORDER.indexOf(a.slot) : 0) - (b.slot ? SLOT_ORDER.indexOf(b.slot) : 0) || (a.group ?? '').localeCompare(b.group ?? '') || teamIdx(a.home) - teamIdx(b.home));

  const settings = (season.data.settings ?? {}) as { tvScene?: string };
  const a = ann.data?.[0];
  return {
    seasonId: sid, fixtures: fx, players: playerRows, teams: teamRows, manualOrder: {}, teamUuid, groupUuid, tvScene: settings.tvScene,
    penalties: (sanctions.data ?? []).map((s) => ({ teamId: slugOf.get(s.team_id) ?? '', points: s.points ?? 0, reason: s.reason })),
    announcement: a && (!a.expires_at || new Date(a.expires_at) > new Date()) ? a.body : undefined,
  };
}
