import type { Division, PairingSlot } from './types';

export interface PlayerInfo { id: string; division: Division; suspended?: boolean; injured?: boolean; name?: string }

/** Ladies only ever play the Ladies pairing; Low may play up into High; High may not play down. */
export function allowedDivisions(slot: PairingSlot, ladiesOnlyInLadies = true): Division[] {
  if (slot === 'ladies') return ['ladies'];
  if (slot === 'low') return ['low'];
  return ladiesOnlyInLadies ? ['high', 'low'] : ['high', 'low', 'ladies'];
}

export function validatePairingPlayers(slot: PairingSlot, players: PlayerInfo[], opts: { ladiesOnlyInLadies?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (players.length !== 2) errors.push('A pairing needs exactly 2 players');
  const ok = allowedDivisions(slot, opts.ladiesOnlyInLadies ?? true);
  for (const p of players) {
    const label = p.name ?? p.id;
    if (!ok.includes(p.division)) {
      if (slot === 'ladies') errors.push(`${label} is not a Ladies player; only ladies may play the Ladies pairing`);
      else if (p.division === 'ladies') errors.push(`${label} is a Ladies player and may only play the Ladies pairing`);
      else if (slot === 'low' && p.division === 'high') errors.push(`${label} is High division and may not play down in the Low pairing`);
      else errors.push(`${label} (${p.division}) is not eligible for the ${slot} pairing`);
    }
    if (p.suspended) errors.push(`${label} is suspended`);
    if (p.injured) errors.push(`${label} is marked injured`);
  }
  if (players.length === 2 && players[0].id === players[1].id) errors.push('A player cannot partner themselves');
  return errors;
}

/** One game per player per game-week across all pairings for that week. Returns the offending player ids. */
export function findDoubleBookings(pairings: { slot: PairingSlot; playerIds: string[] }[], alreadyPlayedThisWeek: Iterable<string> = []): string[] {
  const seen = new Set<string>(alreadyPlayedThisWeek);
  const dupes = new Set<string>();
  for (const p of pairings) for (const id of p.playerIds) { if (seen.has(id)) dupes.add(id); seen.add(id); }
  return [...dupes];
}

export const MIN_SQUAD = { high: 4, ladies: 2, low: 2 } as const;
export function squadShortfall(counts: Record<Division, number>): Record<Division, number> {
  return {
    high: Math.max(0, MIN_SQUAD.high - counts.high),
    ladies: Math.max(0, MIN_SQUAD.ladies - counts.ladies),
    low: Math.max(0, MIN_SQUAD.low - counts.low),
  };
}
