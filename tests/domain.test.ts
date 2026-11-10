import { describe, expect, it } from 'vitest';
import { forfeitFirstSet, forfeitMatch, interruptedSet, pairingPoints, validatePairingResult, validateSet } from '@/domain/scoring';
import { findDoubleBookings, validatePairingPlayers } from '@/domain/eligibility';
import { computeTable } from '@/domain/standings';
import { BRACKET, fixtureOutcome, resolveBracket } from '@/domain/knockout';
import type { FixtureRecord, PairingResult, PairingSlot } from '@/domain/types';

const straight = (h: number, a: number, h2: number, a2: number): PairingResult => ({ set1: { h, a }, set2: { h: h2, a: a2 } });
const HOME_2_0 = straight(6, 3, 6, 4);
const AWAY_2_0 = straight(3, 6, 4, 6);
const HOME_MTB: PairingResult = { set1: { h: 6, a: 4 }, set2: { h: 3, a: 6 }, mtb: { h: 10, a: 8 } };
const AWAY_MTB: PairingResult = { set1: { h: 6, a: 4 }, set2: { h: 3, a: 6 }, mtb: { h: 8, a: 10 } };
const fx = (id: string, home: string, away: string, results: PairingResult[]): FixtureRecord => ({
  id, home, away, pairings: results.map((result, i) => ({ slot: (['ladies', 'low', 'high_1', 'high_2'] as PairingSlot[])[i], result })),
});

describe('points (rules section 5)', () => {
  it('2-0 gives 4/0', () => expect(pairingPoints(HOME_2_0)).toMatchObject({ home: 4, away: 0, winner: 'home' }));
  it('1-1 decided by match tie-break gives 3/1', () => expect(pairingPoints(HOME_MTB)).toMatchObject({ home: 3, away: 1 }));
  it('full-match forfeit is 6-0 6-0 and 4/0', () => {
    const r = forfeitMatch('home');
    expect(r.set1).toMatchObject({ h: 6, a: 0 }); expect(r.set2).toMatchObject({ h: 6, a: 0 });
    expect(pairingPoints(r)).toMatchObject({ home: 4, away: 0 });
  });
  it('team fixture 4,3,4,0 v 0,1,0,4 totals 11 v 5', () => {
    const f = fx('1', 'A', 'B', [HOME_2_0, HOME_MTB, HOME_2_0, AWAY_2_0]);
    const t = computeTable(['A', 'B'], [f]);
    expect(t.rows.find((r) => r.teamId === 'A')!.points).toBe(11);
    expect(t.rows.find((r) => r.teamId === 'B')!.points).toBe(5);
  });
  it('late first set is recorded 6-0 and the interrupted set 6-X', () => {
    expect(forfeitFirstSet('away', { h: 6, a: 2 }, undefined).set1).toMatchObject({ h: 0, a: 6 });
    expect(interruptedSet('home', 3)).toMatchObject({ h: 3, a: 6 });
  });
});

describe('set and match validation', () => {
  it('accepts valid and rejects impossible set scores', () => {
    for (const [h, a] of [[6, 0], [6, 4], [7, 5]]) expect(validateSet({ h, a })).toBeNull();
    for (const [h, a] of [[6, 5], [8, 6], [5, 5], [7, 4]]) expect(validateSet({ h, a })).not.toBeNull();
  });
  it('7-6 needs a valid tie-break', () => {
    expect(validateSet({ h: 7, a: 6 })).not.toBeNull();
    expect(validateSet({ h: 7, a: 6, tb: { h: 7, a: 5 } })).toBeNull();
    expect(validateSet({ h: 7, a: 6, tb: { h: 7, a: 6 } })).not.toBeNull();
  });
  it('match tie-break only when sets are 1-1, win by 2', () => {
    expect(validatePairingResult({ ...HOME_2_0, mtb: { h: 10, a: 5 } })).not.toBeNull();
    expect(validatePairingResult({ set1: { h: 6, a: 4 }, set2: { h: 3, a: 6 } })).not.toBeNull();
    expect(validatePairingResult(HOME_MTB)).toBeNull();
    expect(validatePairingResult({ ...HOME_MTB, mtb: { h: 10, a: 9 } })).not.toBeNull();
    expect(validatePairingResult({ ...HOME_MTB, mtb: { h: 12, a: 10 } })).toBeNull();
  });
});

describe('tables (rules section 5 tie-breaks)', () => {
  it('level on points: sets difference decides', () => {
    // A: one 2-0 win (4 pts, +2). B: mtb win + mtb loss (4 pts, 0).
    const t = computeTable(['A', 'B', 'X'], [fx('1', 'A', 'X', [HOME_2_0]), fx('2', 'B', 'X', [HOME_MTB, AWAY_MTB])]);
    expect(t.rows.map((r) => r.teamId).slice(0, 2)).toEqual(['A', 'B']);
    expect(t.rows[0].note).toMatch(/sets difference/);
  });
  it('level on points and sets: games difference decides', () => {
    const big: PairingResult = { set1: { h: 6, a: 0 }, set2: { h: 4, a: 6 }, mtb: { h: 10, a: 0 } };
    const t = computeTable(['A', 'B', 'X'], [fx('1', 'A', 'X', [big]), fx('2', 'B', 'X', [HOME_MTB])]);
    expect(t.rows.map((r) => r.teamId).slice(0, 2)).toEqual(['A', 'B']);
    expect(t.rows[0].note).toMatch(/games difference/);
  });
  it('level on everything: head-to-head decides', () => {
    const t = computeTable(['A', 'B', 'X', 'Y'], [
      fx('1', 'A', 'B', [HOME_2_0]), fx('2', 'B', 'X', [HOME_2_0]), fx('3', 'Y', 'A', [HOME_2_0]),
    ]);
    expect(t.rows.map((r) => r.teamId)).toEqual(['Y', 'A', 'B', 'X']);
    expect(t.rows[1].note).toBe('Won on head-to-head');
    expect(t.committeeRequired).toBe(false);
  });
  it('cyclic three-way tie needs a committee decision, which a manual order resolves', () => {
    const fixtures = [fx('1', 'A', 'B', [HOME_2_0]), fx('2', 'B', 'C', [HOME_2_0]), fx('3', 'C', 'A', [HOME_2_0])];
    const t = computeTable(['A', 'B', 'C'], fixtures);
    expect(t.committeeRequired).toBe(true);
    expect(t.rows.every((r) => r.committeeFlag)).toBe(true);
    const m = computeTable(['A', 'B', 'C'], fixtures, [], ['C', 'A', 'B']);
    expect(m.committeeRequired).toBe(false);
    expect(m.rows.map((r) => r.teamId)).toEqual(['C', 'A', 'B']);
  });
  it('does not demand a committee decision before the group is complete', () => {
    expect(computeTable(['A', 'B', 'C', 'D'], []).committeeRequired).toBe(false);
    const partial = computeTable(['A', 'B', 'C', 'D'], [fx('1', 'A', 'B', [HOME_2_0]), fx('2', 'C', 'D', [HOME_2_0])]);
    expect(partial.committeeRequired).toBe(false);
  });
  it('point penalties are applied and visible', () => {
    const t = computeTable(['A', 'B'], [fx('1', 'A', 'B', [HOME_2_0])], [{ teamId: 'A', points: 5, reason: 'Conduct' }]);
    expect(t.rows[0].teamId).toBe('B');
    expect(t.rows[1].penalty).toBe(5);
  });
});

describe('pairing rules (section 3)', () => {
  const L = (id: string) => ({ id, division: 'ladies' as const });
  const H = (id: string) => ({ id, division: 'high' as const });
  const W = (id: string) => ({ id, division: 'low' as const });
  it('Low may play up into High', () => expect(validatePairingPlayers('high_1', [W('a'), H('b')])).toEqual([]));
  it('High may not play down into Low', () => expect(validatePairingPlayers('low', [H('a'), W('b')]).length).toBe(1));
  it('only ladies in the Ladies pairing', () => {
    expect(validatePairingPlayers('ladies', [L('a'), H('b')]).length).toBe(1);
    expect(validatePairingPlayers('ladies', [L('a'), L('b')])).toEqual([]);
  });
  it('ladies may not play High or Low', () => {
    expect(validatePairingPlayers('high_1', [L('a'), H('b')]).length).toBe(1);
    expect(validatePairingPlayers('low', [L('a'), W('b')]).length).toBe(1);
  });
  it('one game per player per week', () => {
    expect(findDoubleBookings([{ slot: 'high_1', playerIds: ['a', 'b'] }, { slot: 'low', playerIds: ['b', 'c'] }])).toEqual(['b']);
    expect(findDoubleBookings([{ slot: 'low', playerIds: ['a', 'c'] }], ['a'])).toEqual(['a']);
  });
});

describe('knockouts (section 6)', () => {
  it('seeds QF1..QF4 as A1vB4, B1vA4, A2vB3, B2vA3', () => {
    const slots = resolveBracket({ A: ['A1', 'A2', 'A3', 'A4'], B: ['B1', 'B2', 'B3', 'B4'] }, {}, true);
    const get = (s: string) => slots.find((x) => x.slot === s)!;
    expect([get('QF1').home, get('QF1').away]).toEqual(['A1', 'B4']);
    expect([get('QF2').home, get('QF2').away]).toEqual(['B1', 'A4']);
    expect([get('QF3').home, get('QF3').away]).toEqual(['A2', 'B3']);
    expect([get('QF4').home, get('QF4').away]).toEqual(['B2', 'A3']);
    expect(BRACKET.SF1).toEqual([{ winnerOf: 'QF1' }, { winnerOf: 'QF4' }]);
  });
  it('shows TBD placeholders until groups are complete', () => {
    const q = resolveBracket({ A: [], B: [] }, {}, false)[0];
    expect(q.home).toBeUndefined(); expect(q.homeLabel).toBe('TBD (A1)');
  });
  it('plate fills from QF losers and finals from SF results', () => {
    const slots = resolveBracket({ A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] }, {
      QF1: { winner: 'a1', loser: 'b4' }, QF4: { winner: 'a3', loser: 'b2' },
    }, true);
    const psf1 = slots.find((s) => s.slot === 'PSF1')!;
    expect([psf1.home, psf1.away]).toEqual(['b4', 'b2']);
    const sf1 = slots.find((s) => s.slot === 'SF1')!;
    expect([sf1.home, sf1.away]).toEqual(['a1', 'a3']);
  });
  it('tied knockout fixture requires the deciding set', () => {
    const f = fx('k', 'A', 'B', [HOME_2_0, AWAY_2_0, HOME_2_0, AWAY_2_0]);
    expect(fixtureOutcome(f).status).toBe('tied');
    expect(fixtureOutcome({ ...f, decidingWinner: 'away' })).toMatchObject({ status: 'decided', winner: 'away' });
    expect(fixtureOutcome(fx('k', 'A', 'B', [HOME_2_0])).status).toBe('incomplete');
  });
});
