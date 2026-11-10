import { computeTable, fixtureTotals, type Table } from '@/domain/standings';
import { SLOT_ROUND, fixtureOutcome, resolveBracket, type ResolvedSlot, type Slot } from '@/domain/knockout';
import type { FixtureRecord } from '@/domain/types';
import { TEAMS, SEASON } from './seed';
import { SLOTS, type AppState, type FixtureState } from './store';

export const toRecord = (f: FixtureState): FixtureRecord => ({
  id: f.id, home: f.home, away: f.away, decidingWinner: f.decidingWinner,
  pairings: SLOTS.map((slot) => ({ slot, result: f.pairings[slot].result })),
});

export function groupTables(s: AppState): { A: Table; B: Table } {
  const out = {} as { A: Table; B: Table };
  for (const g of ['A', 'B'] as const) {
    const ids = TEAMS.filter((t) => t.group === g).map((t) => t.id);
    const fx = s.fixtures.filter((f) => f.round === 'group' && f.group === g && f.status === 'final').map(toRecord);
    out[g] = computeTable(ids, fx, s.penalties, s.manualOrder[g]);
  }
  return out;
}

export const groupsComplete = (s: AppState) => s.fixtures.filter((f) => f.round === 'group').every((f) => f.status === 'final');

export function knockoutOutcomes(s: AppState): Partial<Record<Slot, { winner: string; loser: string }>> {
  const out: Partial<Record<Slot, { winner: string; loser: string }>> = {};
  for (const f of s.fixtures) {
    if (!f.slot || f.status !== 'final') continue;
    const o = fixtureOutcome(toRecord(f));
    if (o.status === 'decided') out[f.slot] = o.winner === 'home' ? { winner: f.home, loser: f.away } : { winner: f.away, loser: f.home };
  }
  return out;
}

export function bracket(s: AppState): ResolvedSlot[] {
  const t = groupTables(s);
  return resolveBracket({ A: t.A.rows.map((r) => r.teamId), B: t.B.rows.map((r) => r.teamId) }, knockoutOutcomes(s), groupsComplete(s));
}

/** Knockout fixtures that can now be created (both teams known, no fixture yet). */
export function missingKnockouts(s: AppState) {
  const out: { slot: Slot; round: FixtureState['round']; week: number; date: string; home: string; away: string }[] = [];
  for (const r of bracket(s)) {
    if (!r.home || !r.away || s.fixtures.some((f) => f.slot === r.slot)) continue;
    const round = SLOT_ROUND[r.slot];
    const week = round === 'qf' ? 4 : round === 'sf' || round === 'plate_sf' ? 5 : 6;
    out.push({ slot: r.slot, round, week, date: SEASON.weeks[week - 1].date, home: r.home, away: r.away });
  }
  return out;
}

export { fixtureTotals };
