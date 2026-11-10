import type { PairingPoints, PairingResult, SetScore, Side, TbScore } from './types';

export const VALID_SET_SCORES: ReadonlyArray<[number, number]> = [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6]];

export function validTiebreak(tb: TbScore, target: number): boolean {
  const hi = Math.max(tb.h, tb.a), lo = Math.min(tb.h, tb.a);
  if (tb.h === tb.a || !Number.isInteger(tb.h) || !Number.isInteger(tb.a) || lo < 0) return false;
  return hi === target ? lo <= target - 2 : hi > target && hi - lo === 2;
}

export function setWinner(s: SetScore): Side { return s.h > s.a ? 'home' : 'away'; }

export function validateSet(s: SetScore): string | null {
  if (s.forced) return s.h === s.a ? 'A forfeited set cannot be level' : null;
  const hi = Math.max(s.h, s.a), lo = Math.min(s.h, s.a);
  if (!VALID_SET_SCORES.some(([a, b]) => a === hi && b === lo)) return `${s.h}-${s.a} is not a valid set score`;
  if (hi === 7 && lo === 6) {
    if (!s.tb) return 'A 7-6 set needs its tie-break score';
    if (!validTiebreak(s.tb, 7)) return 'Set tie-break must reach 7 and be won by 2';
    if ((s.h > s.a) !== (s.tb.h > s.tb.a)) return 'Tie-break winner must match the 7-6 set winner';
  } else if (s.tb) return 'Tie-break score only applies to a 7-6 set';
  return null;
}

/** Returns an error string, or null if the whole pairing result is acceptable. */
export function validatePairingResult(r: PairingResult): string | null {
  const e1 = validateSet(r.set1); if (e1) return `Set 1: ${e1}`;
  const e2 = validateSet(r.set2); if (e2) return `Set 2: ${e2}`;
  const split = setWinner(r.set1) !== setWinner(r.set2);
  if (split) {
    if (!r.mtb) return 'Sets are 1-1: the 10-point match tie-break is required';
    if (!validTiebreak(r.mtb, 10)) return 'Match tie-break must reach 10 and be won by 2';
  } else if (r.mtb) return 'Match tie-break only applies when sets are 1-1';
  return null;
}

export function pairingWinner(r: PairingResult): Side {
  if (setWinner(r.set1) === setWinner(r.set2)) return setWinner(r.set1);
  return r.mtb!.h > r.mtb!.a ? 'home' : 'away';
}

/** 2-0 => 4/0, 1-1 => match tie-break winner 3, loser 1. */
export function pairingPoints(r: PairingResult): PairingPoints {
  const winner = pairingWinner(r);
  const straight = setWinner(r.set1) === setWinner(r.set2);
  const [w, l] = straight ? [4, 0] : [3, 1];
  return { winner, home: winner === 'home' ? w : l, away: winner === 'away' ? w : l };
}

/** Sets won by each side; the match tie-break counts as the deciding set. */
export function setsWon(r: PairingResult): { home: number; away: number } {
  let home = 0, away = 0;
  for (const s of [r.set1, r.set2]) { if (setWinner(s) === 'home') home++; else away++; }
  if (r.mtb) { if (r.mtb.h > r.mtb.a) home++; else away++; }
  return { home, away };
}

/** Games for the games difference use set games only (a match tie-break adds no games). */
export function gamesWon(r: PairingResult): { home: number; away: number } {
  return { home: r.set1.h + r.set2.h, away: r.set1.a + r.set2.a };
}

// ---- forfeits and injuries (Rules 7 and 8) ----
const forcedSet = (winner: Side, games: number): SetScore =>
  winner === 'home' ? { h: 6, a: games, forced: true } : { h: games, a: 6, forced: true };

/** 30+ minutes late, walkover or no replacement within 5 minutes: 6-0, 6-0 to the opponent. */
export function forfeitMatch(winner: Side, outcome: PairingResult['outcome'] = 'forfeit_match'): PairingResult {
  return { set1: forcedSet(winner, 0), set2: forcedSet(winner, 0), outcome };
}
/** 15 minutes late: first set recorded 6-0 to the opponent; set 2 (and tie-break) are played normally. */
export function forfeitFirstSet(winner: Side, set2: SetScore, mtb?: TbScore): PairingResult {
  return { set1: forcedSet(winner, 0), set2, mtb, outcome: 'forfeit_set' };
}
/** Interrupted set is recorded 6-X to the opponent, X = the injured pairing's games at that point. */
export function interruptedSet(injuredSide: Side, injuredGames: number): SetScore {
  return forcedSet(injuredSide === 'home' ? 'away' : 'home', injuredGames);
}
