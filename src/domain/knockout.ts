import { pairingPoints } from './scoring';
import type { FixtureRecord, Side } from './types';

export type Slot = 'QF1' | 'QF2' | 'QF3' | 'QF4' | 'SF1' | 'SF2' | 'PSF1' | 'PSF2' | 'FINAL' | 'THIRD' | 'PFINAL' | 'PTHIRD';
export type Source = { seed: 'A' | 'B'; pos: number } | { winnerOf: Slot } | { loserOf: Slot };

/** Rules section 6. */
export const BRACKET: Record<Slot, [Source, Source]> = {
  QF1: [{ seed: 'A', pos: 1 }, { seed: 'B', pos: 4 }],
  QF2: [{ seed: 'B', pos: 1 }, { seed: 'A', pos: 4 }],
  QF3: [{ seed: 'A', pos: 2 }, { seed: 'B', pos: 3 }],
  QF4: [{ seed: 'B', pos: 2 }, { seed: 'A', pos: 3 }],
  SF1: [{ winnerOf: 'QF1' }, { winnerOf: 'QF4' }],
  SF2: [{ winnerOf: 'QF2' }, { winnerOf: 'QF3' }],
  PSF1: [{ loserOf: 'QF1' }, { loserOf: 'QF4' }],
  PSF2: [{ loserOf: 'QF2' }, { loserOf: 'QF3' }],
  FINAL: [{ winnerOf: 'SF1' }, { winnerOf: 'SF2' }],
  THIRD: [{ loserOf: 'SF1' }, { loserOf: 'SF2' }],
  PFINAL: [{ winnerOf: 'PSF1' }, { winnerOf: 'PSF2' }],
  PTHIRD: [{ loserOf: 'PSF1' }, { loserOf: 'PSF2' }],
};
export const SLOT_ORDER = Object.keys(BRACKET) as Slot[];
export const SLOT_ROUND: Record<Slot, 'qf' | 'sf' | 'final' | 'third' | 'plate_sf' | 'plate_final' | 'plate_third'> = {
  QF1: 'qf', QF2: 'qf', QF3: 'qf', QF4: 'qf', SF1: 'sf', SF2: 'sf', PSF1: 'plate_sf', PSF2: 'plate_sf',
  FINAL: 'final', THIRD: 'third', PFINAL: 'plate_final', PTHIRD: 'plate_third',
};

export function sourceLabel(s: Source): string {
  if ('seed' in s) return `${s.seed}${s.pos}`;
  if ('winnerOf' in s) return `Winner ${s.winnerOf}`;
  return `Loser ${s.loserOf}`;
}

export type FixtureOutcome =
  | { status: 'incomplete'; homePts: number; awayPts: number }
  | { status: 'tied'; homePts: number; awayPts: number } // knockout needs a deciding set
  | { status: 'decided'; winner: Side; homePts: number; awayPts: number };

/** Knockout winner = higher total pairing points; a tie needs the deciding set. */
export function fixtureOutcome(f: FixtureRecord, pairingsExpected = 4): FixtureOutcome {
  let homePts = 0, awayPts = 0, done = 0;
  for (const p of f.pairings) if (p.result) { const pp = pairingPoints(p.result); homePts += pp.home; awayPts += pp.away; done++; }
  if (done < pairingsExpected) return { status: 'incomplete', homePts, awayPts };
  if (homePts !== awayPts) return { status: 'decided', winner: homePts > awayPts ? 'home' : 'away', homePts, awayPts };
  if (f.decidingWinner) return { status: 'decided', winner: f.decidingWinner, homePts, awayPts };
  return { status: 'tied', homePts, awayPts };
}

export interface ResolvedSlot { slot: Slot; home?: string; away?: string; homeLabel: string; awayLabel: string }

/** `seeds` are final group tables (team ids by position); `outcomes` are decided knockout fixtures by slot. */
export function resolveBracket(
  seeds: { A: string[]; B: string[] },
  outcomes: Partial<Record<Slot, { winner: string; loser: string }>>,
  groupsComplete: boolean,
): ResolvedSlot[] {
  const pick = (s: Source): string | undefined => {
    if ('seed' in s) return groupsComplete ? seeds[s.seed][s.pos - 1] : undefined;
    if ('winnerOf' in s) return outcomes[s.winnerOf]?.winner;
    return outcomes[s.loserOf]?.loser;
  };
  return SLOT_ORDER.map((slot) => {
    const [a, b] = BRACKET[slot];
    return { slot, home: pick(a), away: pick(b), homeLabel: `TBD (${sourceLabel(a)})`, awayLabel: `TBD (${sourceLabel(b)})` };
  });
}
