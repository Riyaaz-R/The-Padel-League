import 'server-only';
import { fixtureTotals, groupTables, toRecord } from '@/data/derive';
import { loadState } from '@/data/db';
import { loadWinners } from '@/data/winners';
import { loadBanner, type BannerView } from '@/data/sponsors';
import { SLOTS, type AppState, type FixtureState, type LiveState, type PlayerRow, type TeamRow } from '@/data/store';
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
  now: string; today: string; tvScene?: string; announcement?: string; winners: { week: number; name: string }[]; sponsorBanner: BannerView;
  fixtures: SnapFixture[]; tables: { A: SnapTableRow[]; B: SnapTableRow[] };
  bracket: { slot: string; home?: string; away?: string; homeLabel: string; awayLabel: string }[];
  teams: Record<string, { name: string; logo: string }>;
}

const names = (players: PlayerRow[], ids: string[]) => ids.map((id) => players.find((p) => p.id === id)?.name ?? '').filter(Boolean).join(' & ') || 'TBC';
const tm = (teams: TeamRow[], id: string) => { const t = teams.find((x) => x.id === id); return { id, name: t?.name ?? id, short: t?.short ?? id.slice(0, 3).toUpperCase(), logo: t?.logo ?? '/logos/league-badge.webp' }; };

function snapFixture(f: FixtureState, players: PlayerRow[], teams: TeamRow[]): SnapFixture {
  const t = fixtureTotals(toRecord(f));
  return {
    id: f.id, round: f.round, week: f.week, date: f.date, time: f.time, court: f.court, status: f.status, home: tm(teams, f.home), away: tm(teams, f.away),
    homePts: t.homePts, awayPts: t.awayPts,
    pairings: SLOTS.map((slot) => {
      const p = f.pairings[slot];
      const pp = p.result ? pairingPoints(p.result) : undefined;
      return { slot, home: names(players, p.homePlayers), away: names(players, p.awayPlayers), text: scoreText(p.result), live: p.live, result: p.result, winner: pp?.winner, ptsH: pp?.home, ptsA: pp?.away };
    }),
  };
}

export async function snapshot(): Promise<Snapshot> {
  const [s, winners, sponsorBanner]: [AppState, Awaited<ReturnType<typeof loadWinners>>, BannerView] = await Promise.all([loadState(), loadWinners(), loadBanner()]);
  const tables = groupTables(s);
  const row = (r: ReturnType<typeof groupTables>['A']['rows'][number]): SnapTableRow => ({
    teamId: r.teamId, name: tm(s.teams, r.teamId).name, logo: tm(s.teams, r.teamId).logo, pos: r.pos,
    played: r.played, setsDiff: r.setsW - r.setsL, gamesDiff: r.gamesW - r.gamesL, points: r.points - r.penalty, note: r.note,
  });
  return {
    now: new Date().toISOString(), today: todaySAST(), tvScene: s.tvScene, announcement: s.announcement, winners: winners.map((w) => ({ week: w.week, name: w.name })), sponsorBanner,
    fixtures: s.fixtures.map((f) => snapFixture(f, s.players, s.teams)), tables: { A: tables.A.rows.map(row), B: tables.B.rows.map(row) },
    bracket: bracket(s), teams: Object.fromEntries(s.teams.map((t) => [t.id, { name: t.name, logo: t.logo }])),
  };
}
