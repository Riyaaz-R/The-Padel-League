'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { audit, requireStaffAction } from '@/lib/auth';
import { loadStateFresh, resultToRow } from '@/data/db';
import { SLOTS, type AppState, type FixtureState, type FixtureStatus } from '@/data/store';
import { missingKnockouts } from '@/data/derive';
import { findDoubleBookings, validatePairingPlayers } from '@/domain/eligibility';
import { forfeitFirstSet, forfeitMatch, pairingPoints, validatePairingResult } from '@/domain/scoring';
import type { PairingResult, PairingSlot, SetScore, Side, TbScore } from '@/domain/types';

const back = (id: string, msg: string, kind: 'ok' | 'error' = 'error', slot?: string): never =>
  redirect(`/admin/fixtures/${id}?${kind}=${encodeURIComponent(msg)}${slot ? `#${slot}` : ''}`);
const num = (v: FormDataEntryValue | null): number | undefined => { const s = String(v ?? '').trim(); return s === '' ? undefined : Number(s); };
const tb = (h: number | undefined, a: number | undefined): TbScore | undefined => (h === undefined || a === undefined ? undefined : { h, a });
const refresh = () => revalidatePath('/', 'layout');

/** Creates knockout fixtures as soon as both teams are known (idempotent: unique index on season+slot). */
async function syncKnockouts(db: SupabaseClient, s: AppState) {
  for (const k of missingKnockouts(s)) {
    const r = await db.from('fixtures').insert({ season_id: s.seasonId, round: k.round, week: k.week, slot: k.slot, home_team: s.teamUuid[k.home], away_team: s.teamUuid[k.away], match_date: k.date });
    if (r.error && r.error.code !== '23505') throw new Error(r.error.message);
  }
}

async function ensurePairing(db: SupabaseClient, f: FixtureState, slot: PairingSlot, ids?: { h: string[]; a: string[] }): Promise<{ id?: string; error?: string }> {
  const { data: ex } = await db.from('pairings').select('id').eq('fixture_id', f.id).eq('slot', slot).maybeSingle();
  const cols = ids ? { home_p1: ids.h[0] ?? null, home_p2: ids.h[1] ?? null, away_p1: ids.a[0] ?? null, away_p2: ids.a[1] ?? null } : {};
  if (ex) {
    if (ids) { const u = await db.from('pairings').update(cols).eq('id', ex.id); if (u.error) return { error: u.error.message }; }
    return { id: ex.id };
  }
  const ins = await db.from('pairings').insert({ fixture_id: f.id, slot, ...cols }).select('id').single();
  return ins.error ? { error: ins.error.message } : { id: ins.data.id };
}

export async function saveFixtureMeta(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = String(fd.get('id')); const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f) return redirect('/admin');
  const time = String(fd.get('time') ?? '').trim(), court = String(fd.get('court') ?? '').trim(), date = String(fd.get('date') ?? '').trim();
  const r = await db.from('fixtures').update({ start_time: time || null, court: court || null, ...(/^\d{4}-\d{2}-\d{2}$/.test(date) ? { match_date: date } : {}), version: f.version + 1 }).eq('id', id);
  if (r.error) return back(id, r.error.message);
  await audit(db, staff, 'fixture.meta', `${f.date} ${f.time ?? ''} court ${f.court ?? ''} -> ${date} ${time} court ${court}`, undefined, id);
  refresh(); back(id, 'Time, court and date saved', 'ok');
}

export async function setStatus(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = String(fd.get('id')); const status = String(fd.get('status')) as FixtureStatus; const reason = String(fd.get('reason') ?? '').trim();
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f) return redirect('/admin');
  if (!['scheduled', 'live', 'awaiting_confirmation', 'final', 'disputed'].includes(status)) return back(id, 'Unknown status');
  if (status === 'final') {
    const missing = SLOTS.filter((sl) => !f.pairings[sl].result);
    if (missing.length) return back(id, `Cannot verify: missing results for ${missing.join(', ')}`);
  }
  if (f.status === 'final' && status !== 'final' && !reason) return back(id, 'A reason is required to reopen a verified result');
  const r = await db.from('fixtures').update({ status, version: f.version + 1 }).eq('id', id).eq('version', f.version).select('id');
  if (r.error) return back(id, r.error.message);
  if (!r.data?.length) return back(id, 'Someone else changed this fixture. Reload and try again.');
  await audit(db, staff, 'fixture.status', `${f.status} -> ${status}`, reason || undefined, id);
  await syncKnockouts(db, await loadStateFresh());
  refresh(); back(id, `Status set to ${status.replace('_', ' ')}`, 'ok');
}

export async function savePairing(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = String(fd.get('id')); const slot = String(fd.get('slot')) as PairingSlot; const intent = String(fd.get('intent') ?? 'save');
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f || !SLOTS.includes(slot)) return redirect('/admin');
  if (Number(fd.get('version')) !== f.version) return back(id, 'Someone else changed this fixture. Reload and try again.', 'error', slot);
  const wasFinal = f.status === 'final';
  const reason = String(fd.get('reason') ?? '').trim();
  if (wasFinal && !reason) return back(id, 'This result is verified. Enter a reason to correct it.', 'error', slot);

  const players = (side: 'home' | 'away') => [String(fd.get(`${side}1`) ?? ''), String(fd.get(`${side}2`) ?? '')].filter(Boolean);
  const hp = players('home'), ap = players('away');
  const P = (pid: string) => s.players.find((x) => x.id === pid);
  const info = (ids: string[]) => ids.map((pid) => ({ id: pid, division: P(pid)?.division ?? ('high' as const), name: P(pid)?.name }));
  const setPlayers = hp.length > 0 || ap.length > 0;
  if (setPlayers) {
    const errs = [...validatePairingPlayers(slot, info(hp)), ...validatePairingPlayers(slot, info(ap))];
    for (const [teamId, ids] of [[f.home, hp], [f.away, ap]] as const) {
      const others = s.fixtures.filter((x) => x.week === f.week && (x.home === teamId || x.away === teamId))
        .flatMap((x) => SLOTS.filter((sl) => !(x.id === f.id && sl === slot)).flatMap((sl) => [...x.pairings[sl].homePlayers, ...x.pairings[sl].awayPlayers]));
      for (const d of findDoubleBookings([{ slot, playerIds: [...ids] }], others)) errs.push(`${P(d)?.name ?? d} already plays another pairing this week`);
      for (const pid of ids) if (P(pid)?.teamId !== teamId) errs.push(`${P(pid)?.name ?? pid} is not on this team`);
    }
    if (errs.length) return back(id, errs.join('. '), 'error', slot);
  }

  let result: PairingResult | undefined;
  if (intent !== 'clear' && intent !== 'players') {
    const set = (n: 1 | 2): SetScore | undefined => {
      const h = num(fd.get(`s${n}h`)), a = num(fd.get(`s${n}a`)); if (h === undefined || a === undefined) return undefined;
      const t = tb(num(fd.get(`s${n}tbh`)), num(fd.get(`s${n}tba`)));
      return { h, a, ...(t ? { tb: t } : {}) };
    };
    const m = /^(forfeit_match|walkover|forfeit_set)_(home|away)$/.exec(intent);
    if (m) {
      const winner = m[2] as Side;
      if (m[1] === 'forfeit_set') {
        const s2 = set(2); if (!s2) return back(id, 'Enter set 2 (and tie-break if 1-1) for a late-first-set result', 'error', slot);
        result = forfeitFirstSet(winner, s2, tb(num(fd.get('mh')), num(fd.get('ma'))));
      } else result = forfeitMatch(winner, m[1] as 'forfeit_match' | 'walkover');
    } else {
      const s1 = set(1), s2 = set(2);
      if (!s1 || !s2) return back(id, 'Enter both set scores', 'error', slot);
      result = { set1: s1, set2: s2, mtb: tb(num(fd.get('mh')), num(fd.get('ma'))), outcome: intent === 'retired' ? 'retired' : 'normal' };
    }
    const err = validatePairingResult(result);
    if (err) return back(id, err, 'error', slot);
  }

  // claim the version first so two scorers cannot overwrite each other
  const nextStatus: FixtureStatus = wasFinal ? 'awaiting_confirmation' : f.status === 'scheduled' ? 'live' : f.status;
  const claim = await db.from('fixtures').update({ version: f.version + 1, status: nextStatus, ...(wasFinal ? { corrected_at: new Date().toISOString() } : {}) }).eq('id', id).eq('version', f.version).select('id');
  if (claim.error) return back(id, claim.error.message, 'error', slot);
  if (!claim.data?.length) return back(id, 'Someone else changed this fixture. Reload and try again.', 'error', slot);

  const pr = await ensurePairing(db, f, slot, setPlayers ? { h: hp, a: ap } : undefined);
  if (pr.error) return back(id, pr.error, 'error', slot);
  if (intent === 'clear') {
    await db.from('pairing_results').delete().eq('pairing_id', pr.id!);
    await db.from('live_pairing_state').delete().eq('pairing_id', pr.id!);
  } else if (result) {
    const w = pairingPoints(result);
    const up = await db.from('pairing_results').upsert(resultToRow(pr.id!, result, { home: w.home, away: w.away }));
    if (up.error) return back(id, up.error.message, 'error', slot);
    await db.from('live_pairing_state').delete().eq('pairing_id', pr.id!);
  }
  await audit(db, staff, `pairing.${intent}`, `${slot}`, reason || undefined, id);
  await syncKnockouts(db, await loadStateFresh());
  refresh();
  back(id, wasFinal ? 'Corrected. Result reopened for re-verification.' : 'Saved', 'ok', slot);
}

export async function saveLive(fd: FormData) {
  const { db, staff } = await requireStaffAction('scorer');
  const id = String(fd.get('id')); const slot = String(fd.get('slot')) as PairingSlot;
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f || !SLOTS.includes(slot)) return redirect('/admin/live');
  const setNo = Math.min(3, Math.max(1, Number(fd.get('setNo')) || 1));
  const cap = setNo === 3 ? 30 : 7;
  const pr = await ensurePairing(db, f, slot);
  if (pr.error) return redirect(`/admin/live?error=${encodeURIComponent(pr.error)}`);
  const up = await db.from('live_pairing_state').upsert({
    pairing_id: pr.id, set_no: setNo, games_h: Math.min(cap, Math.max(0, Number(fd.get('gamesH')) || 0)), games_a: Math.min(cap, Math.max(0, Number(fd.get('gamesA')) || 0)),
    tiebreak: fd.get('tiebreak') === 'on', updated_at: new Date().toISOString(),
  });
  if (up.error) return redirect(`/admin/live?error=${encodeURIComponent(up.error.message)}`);
  if (f.status === 'scheduled') await db.from('fixtures').update({ status: 'live' }).eq('id', id); // committee only (RLS); a scorer's attempt is a no-op
  await audit(db, staff, 'live.update', `${slot} set ${setNo}`, undefined, id);
  refresh(); redirect('/admin/live?ok=1');
}

export async function setDeciding(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = String(fd.get('id')); const w = String(fd.get('winner'));
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f || f.round === 'group') return redirect('/admin');
  const r = await db.from('fixtures').update({ deciding_winner: w === 'home' || w === 'away' ? w : null, version: f.version + 1 }).eq('id', id);
  if (r.error) return back(id, r.error.message);
  await audit(db, staff, 'fixture.deciding', w || 'cleared', undefined, id);
  await syncKnockouts(db, await loadStateFresh());
  refresh(); back(id, 'Deciding set recorded', 'ok');
}

export async function addAnnouncement(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const text = String(fd.get('text') ?? '').trim().slice(0, 240);
  const s = await loadStateFresh();
  await db.from('announcements').delete().eq('season_id', s.seasonId);
  if (text) await db.from('announcements').insert({ season_id: s.seasonId, body: text });
  await audit(db, staff, 'announcement', text || '(cleared)');
  refresh(); redirect('/admin');
}

export async function setTvScene(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const v = String(fd.get('scene') ?? '');
  const s = await loadStateFresh();
  const { data } = await db.from('seasons').select('settings').eq('id', s.seasonId).single();
  const settings = { ...((data?.settings as object) ?? {}), tvScene: v || null };
  await db.from('seasons').update({ settings }).eq('id', s.seasonId);
  await audit(db, staff, 'tv.scene', v || 'auto');
  refresh(); redirect('/admin');
}

export async function addPenalty(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const teamId = String(fd.get('teamId')); const points = Number(fd.get('points')); const reason = String(fd.get('reason') ?? '').trim();
  if (!teamId || !(points > 0) || !reason) redirect('/admin?error=Penalty needs a team, points and a reason');
  const s = await loadStateFresh();
  const r = await db.from('sanctions').insert({ season_id: s.seasonId, kind: 'point_penalty', team_id: s.teamUuid[teamId], points, reason, issued_by: staff.userId });
  if (r.error) redirect(`/admin?error=${encodeURIComponent(r.error.message)}`);
  await audit(db, staff, 'penalty', `${teamId} -${points}`, reason);
  refresh(); redirect('/admin');
}

