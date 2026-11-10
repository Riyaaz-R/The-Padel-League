import { gamesWon, pairingPoints, setsWon } from './scoring';
import type { FixtureRecord, Penalty } from './types';

export interface Row {
  teamId: string; played: number; pairingsW: number; pairingsL: number;
  setsW: number; setsL: number; gamesW: number; gamesL: number;
  points: number; penalty: number; form: ('W' | 'D' | 'L')[];
  pos: number; note?: string; committeeFlag?: boolean;
}
export interface Table { rows: Row[]; committeeRequired: boolean }

export function fixtureTotals(f: FixtureRecord) {
  let homePts = 0, awayPts = 0, pH = 0, pA = 0, sH = 0, sA = 0, gH = 0, gA = 0, done = 0;
  for (const p of f.pairings) {
    if (!p.result) continue;
    done++;
    const pp = pairingPoints(p.result), ss = setsWon(p.result), gg = gamesWon(p.result);
    homePts += pp.home; awayPts += pp.away;
    if (pp.winner === 'home') pH++; else pA++;
    sH += ss.home; sA += ss.away; gH += gg.home; gA += gg.away;
  }
  return { homePts, awayPts, pH, pA, sH, sA, gH, gA, done };
}

const empty = (teamId: string): Row => ({ teamId, played: 0, pairingsW: 0, pairingsL: 0, setsW: 0, setsL: 0, gamesW: 0, gamesL: 0, points: 0, penalty: 0, form: [], pos: 0 });

function accumulate(teamIds: string[], fixtures: FixtureRecord[]): Map<string, Row> {
  const m = new Map(teamIds.map((t) => [t, empty(t)] as const));
  const res = (x: number, y: number): 'W' | 'D' | 'L' => (x > y ? 'W' : x < y ? 'L' : 'D');
  for (const f of fixtures) {
    const h = m.get(f.home), a = m.get(f.away);
    if (!h || !a) continue;
    const t = fixtureTotals(f);
    if (t.done === 0) continue;
    h.played++; a.played++;
    h.points += t.homePts; a.points += t.awayPts;
    h.pairingsW += t.pH; h.pairingsL += t.pA; a.pairingsW += t.pA; a.pairingsL += t.pH;
    h.setsW += t.sH; h.setsL += t.sA; a.setsW += t.sA; a.setsL += t.sH;
    h.gamesW += t.gH; h.gamesL += t.gA; a.gamesW += t.gA; a.gamesL += t.gH;
    h.form.push(res(t.homePts, t.awayPts)); a.form.push(res(t.awayPts, t.homePts));
  }
  return m;
}

const eff = (r: Row) => r.points - r.penalty;

/**
 * Group ranking: points, sets difference, games difference, head-to-head (only among the tied teams,
 * re-evaluated as the tied set shrinks), then a committee flag. `manualOrder` is the committee's decision.
 */
export function computeTable(teamIds: string[], fixtures: FixtureRecord[], penalties: Penalty[] = [], manualOrder?: string[]): Table {
  const rows = accumulate(teamIds, fixtures);
  for (const p of penalties) { const r = rows.get(p.teamId); if (r) r.penalty += p.points; }
  const ordered: Row[] = [];
  let committeeRequired = false;

  const split = (group: Row[], key: (r: Row) => number): Row[][] => {
    const buckets = new Map<number, Row[]>();
    for (const r of group) { const k = key(r); const b = buckets.get(k); if (b) b.push(r); else buckets.set(k, [r]); }
    return [...buckets.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v);
  };
  // A committee decision is only meaningful once every team has played its full round-robin.
  const settled = [...rows.values()].every((r) => r.played >= teamIds.length - 1);
  const flag = (g: Row[]) => {
    if (!settled) { for (const r of g) r.note = r.note ?? 'Level on all criteria so far'; ordered.push(...g); return; }
    committeeRequired = true; for (const r of g) { r.committeeFlag = true; r.note = 'Committee decision required'; } ordered.push(...g);
  };

  const stages: [(r: Row) => number, string][] = [
    [eff, 'points'], [(r) => r.setsW - r.setsL, 'sets difference'], [(r) => r.gamesW - r.gamesL, 'games difference'],
  ];
  const resolve = (group: Row[], stage: number, note?: string): void => {
    if (group.length === 1) { if (note && !group[0].note) group[0].note = note; ordered.push(group[0]); return; }
    if (stage < stages.length) {
      const parts = split(group, stages[stage][0]);
      if (parts.length === 1) return resolve(group, stage + 1, note);
      for (const part of parts) resolve(part, stage + 1, stage === 0 ? undefined : `Won on ${stages[stage][1]}`);
      return;
    }
    const ids = new Set(group.map((r) => r.teamId));
    const sub = accumulate([...ids], fixtures.filter((f) => ids.has(f.home) && ids.has(f.away)));
    const parts = split(group, (r) => sub.get(r.teamId)!.points);
    if (parts.length === 1) return flag(group); // head-to-head cannot separate them
    for (const part of parts) {
      if (part.length === 1) { part[0].note = 'Won on head-to-head'; ordered.push(part[0]); }
      else if (part.length < group.length) resolve(part, stage); // re-evaluate among the smaller tied set
      else flag(part);
    }
  };
  resolve([...rows.values()], 0);

  let final = ordered;
  if (manualOrder && committeeRequired) {
    const idx = (r: Row) => { const i = manualOrder.indexOf(r.teamId); return i < 0 ? 999 : i; };
    // reorder only within each contiguous flagged block
    final = [];
    for (let i = 0; i < ordered.length;) {
      if (!ordered[i].committeeFlag) { final.push(ordered[i++]); continue; }
      let j = i; while (j < ordered.length && ordered[j].committeeFlag) j++;
      final.push(...ordered.slice(i, j).sort((a, b) => idx(a) - idx(b))); i = j;
    }
    if (final.every((r) => !r.committeeFlag || manualOrder.includes(r.teamId))) {
      committeeRequired = false;
      for (const r of final) if (r.committeeFlag) { r.note = 'Committee decision'; r.committeeFlag = false; }
    }
  }
  final.forEach((r, i) => { r.pos = i + 1; r.form = r.form.slice(-3); });
  return { rows: final, committeeRequired };
}
