import 'server-only';
import { fixtureTotals, groupTables, toRecord } from '@/data/derive';
import { TEAMS } from '@/data/seed';
import { loadState } from '@/data/db';
import { loadWinners } from '@/data/winners';
import { SLOTS, type AppState, type FixtureState, type LiveState, type PlayerRow } from '@/data/store';
import { pairingPoints } from '@/domain/scoring';
import { bracket } from '@/data/derive';
import { todaySAST } from '@/lib/format';
import { scoreText } from '@/lib/score-text';
import type { PairingResult, PairingSlot } from '@/domain/types';

export interface SnapPairing { slot: PairingSlot; home: string; away: string; text: string; live?: LiveState; result?: PairingResult; winner?: 'home' | 'away'; ptsH?: number; ptsA?: number }
export interface SnapFixture {
  id: string; round: string; week: number; date: string; time?: string; court?: string; status: string;
  home: { id: string; name: string; short: string; logo: string }; away: { id: string; name: string; short: string; logo: string };
  homePts: number; awayPts: number; pairings: SnapPairing[];
}
export interface SnapTableRow { teamId: string; name: string; logo: string; pos: number; played: number; setsDiff: number; gamesDiff: number; points: number; note?: string }
export interface Snapshot {
  now: string; today: string; tvScene?: string; announcement?: string; winners: { week: number; name: string }[];
  fixtures: SnapFixture[]; tables: { A: SnapTableRow[]; B: SnapTableRow[] };
  bracket: { slot: string; home?: string; away?: string; homeLabel: string; awayLabel: string }[];
  teams: Record<string, { name: string; logo: string }>;
}

const names = (players: PlayerRow[], ids: string[]) => ids.map((id) => players.find((p) => p.id === id)?.name ?? '').filter(Boolean).join(' & ') || 'TBC';
const tm = (id: string) => { const t = TEAMS.find((x) => x.id === id)!; return { id, name: t.name, short: t.short, logo: t.logo }; };

function snapFixture(f: FixtureState, players: PlayerRow[]): SnapFixture {
  const t = fixtureTotals(toRecord(f));
  return {
    id: f.id, round: f.round, week: f.week, date: f.date, time: f.time, court: f.court, status: f.status, home: tm(f.home), away: tm(f.away),
    homePts: t.homePts, awayPts: t.awayPts,
    pairings: SLOTS.map((slot) => {
      const p = f.pairings[slot];
      const pp = p.result ? pairingPoints(p.result) : undefined;
      return { slot, home: names(players, p.homePlayers), away: names(players, p.awayPlayers), text: scoreText(p.result), live: p.live, result: p.result, winner: pp?.winner, ptsH: pp?.home, ptsA: pp?.away };
    }),
  };
}

export async function snapshot(): Promise<Snapshot> {
  const [s, winners]: [AppState, Awaited<ReturnType<typeof loadWinners>>] = await Promise.all([loadState(), loadWinners()]);
  const tables = groupTables(s);
  const row = (r: ReturnType<typeof groupTables>['A']['rows'][number]): SnapTableRow => ({
    teamId: r.teamId, name: TEAMS.find((t) => t.id === r.teamId)!.name, logo: TEAMS.find((t) => t.id === r.teamId)!.logo, pos: r.pos,
    played: r.played, setsDiff: r.setsW - r.setsL, gamesDiff: r.gamesW - r.gamesL, points: r.points - r.penalty, note: r.note,
  });
  return {
    now: new Date().toISOString(), today: todaySAST(), tvScene: s.tvScene, announcement: s.announcement, winners: winners.map((w) => ({ week: w.week, name: w.name })),
    fixtures: s.fixtures.map((f) => snapFixture(f, s.players)), tables: { A: tables.A.rows.map(row), B: tables.B.rows.map(row) },
    bracket: bracket(s), teams: Object.fromEntries(TEAMS.map((t) => [t.id, { name: t.name, logo: t.logo }])),
  };
}
