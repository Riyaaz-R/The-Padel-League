import { describe, expect, it } from 'vitest';
import { checkSeed, GROUP_FIXTURES, PLAYERS, TEAMS } from '@/data/seed';

describe('Season 1 seed', () => {
  it('meets the squad minimums with no duplicate players', () => expect(checkSeed()).toEqual([]));
  it('has 8 teams, 12 group fixtures, 4 per week, each pair once', () => {
    expect(TEAMS).toHaveLength(8);
    expect(GROUP_FIXTURES).toHaveLength(12);
    const pairs = new Set(GROUP_FIXTURES.map((f) => [f.home, f.away].sort().join('|')));
    expect(pairs.size).toBe(12);
  });
  it('keeps single names exactly and flags them', () => {
    const karlo = PLAYERS.find((p) => p.name === 'Karlo')!;
    expect(karlo.nameIncomplete).toBe(true);
    expect(PLAYERS.find((p) => p.name === 'Muhammed Rawat')).toBeTruthy();
    expect(PLAYERS.find((p) => p.name === 'Saaid Nordien')!.teamId).toBe('tpc-spartans');
    expect(PLAYERS.find((p) => p.name === 'Saood Nordien')!.teamId).toBe('tpc-titans');
  });
});
