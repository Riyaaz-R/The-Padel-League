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
import { slotLabel } from '@/lib/format';

const ROUNDS = ['group', 'qf', 'sf', 'final', 'third', 'plate_sf', 'plate_final', 'plate_third'] as const;
const back = (id: string, msg: string, kind: 'ok' | 'error' = 'error', slot?: string): never =>
  redirect(`/admin/fixtures/${id}?${kind}=${encodeURIComponent(msg)}${slot ? `#${slot}` : ''}`);
const num = (v: FormDataEntryValue | null): number | undefined => { const s = String(v ?? '').trim(); return s === '' ? undefined : Number(s); };
const tb = (h: number | undefined, a: number | undefined): TbScore | undefined => (h === undefined || a === undefined ? undefined : { h, a });
const refresh = () => revalidatePath('/', 'layout');
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

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

// ---------------- create / edit a fixture (no score needed) ----------------
interface FixtureFields { round: string; group: string; week: number; date: string; time: string; court: string; home: string; away: string }
function readFixture(fd: FormData): FixtureFields {
  return { round: str(fd, 'round'), group: str(fd, 'group'), week: Number(str(fd, 'week')), date: str(fd, 'date'), time: str(fd, 'time'), court: str(fd, 'court'), home: str(fd, 'home'), away: str(fd, 'away') };
}
function fixtureProblems(f: FixtureFields, s: AppState): string[] {
  const e: string[] = [];
  if (!(ROUNDS as readonly string[]).includes(f.round)) e.push('Choose a round');
  if (!Number.isInteger(f.week) || f.week < 1 || f.week > 6) e.push('Choose a week from 1 to 6');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) e.push('Enter a date');
  if (!s.teamUuid[f.home] || !s.teamUuid[f.away]) e.push('Choose both teams');
  else if (f.home === f.away) e.push('A team cannot play itself');
  if (f.round === 'group') {
    if (f.group !== 'A' && f.group !== 'B') e.push('Choose the group for a group-stage fixture');
    else for (const id of [f.home, f.away]) if (s.teams.find((t) => t.id === id)?.group !== f.group) e.push(`${s.teams.find((t) => t.id === id)?.name ?? id} is not in Group ${f.group}`);
  }
  if (f.court.length > 20) e.push('Court is too long');
  return e;
}
const dupMsg = 'These two teams already play each other in the group stage.';

export async function createFixture(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const f = readFixture(fd); const s = await loadStateFresh();
  const errs = fixtureProblems(f, s);
  if (errs.length) return redirect(`/admin/fixtures/new?error=${encodeURIComponent(errs.join('. '))}`);
  const r = await db.from('fixtures').insert({
    season_id: s.seasonId, round: f.round, week: f.week, group_id: f.round === 'group' ? s.groupUuid[f.group] : null, home_team: s.teamUuid[f.home], away_team: s.teamUuid[f.away],
    match_date: f.date, start_time: f.time || null, court: f.court || null, status: 'scheduled',
  }).select('id').single();
  if (r.error) return redirect(`/admin/fixtures/new?error=${encodeURIComponent(r.error.code === '23505' ? dupMsg : r.error.message)}`);
  await audit(db, staff, 'fixture.create', `${f.home} v ${f.away} (${f.round}, ${f.date})`, undefined, r.data.id);
  refresh(); back(r.data.id, 'Fixture created. It is Scheduled: add players now, or go live when it starts.', 'ok');
}

export async function saveFixtureMeta(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const s = await loadStateFresh(); const f0 = s.fixtures.find((x) => x.id === id);
  if (!f0) return redirect('/admin');
  const f = readFixture(fd);
  const locked = Boolean(f0.slot); // knockout fixtures created from the bracket keep their teams and round
  const merged: FixtureFields = locked ? { ...f, round: f0.round, group: f0.group ?? '', week: f0.week, home: f0.home, away: f0.away } : f;
  const errs = fixtureProblems(merged, s);
  if (errs.length) return back(id, errs.join('. '));
  const teamsChanged = merged.home !== f0.home || merged.away !== f0.away;
  if (teamsChanged && SLOTS.some((sl) => f0.pairings[sl].homePlayers.length || f0.pairings[sl].awayPlayers.length || f0.pairings[sl].result))
    return back(id, 'This fixture already has players or scores saved, so its teams cannot be changed. Clear the pairings first.');
  const patch = {
    match_date: merged.date, start_time: merged.time || null, court: merged.court || null, version: f0.version + 1,
    ...(locked ? {} : { round: merged.round, week: merged.week, group_id: merged.round === 'group' ? s.groupUuid[merged.group] : null, home_team: s.teamUuid[merged.home], away_team: s.teamUuid[merged.away] }),
  };
  const r = await db.from('fixtures').update(patch).eq('id', id);
  if (r.error) return back(id, r.error.code === '23505' ? dupMsg : r.error.message);
  await audit(db, staff, 'fixture.edit', `${f0.home} v ${f0.away} -> ${merged.home} v ${merged.away}; ${merged.date} ${merged.time} court ${merged.court}`, undefined, id);
  refresh(); back(id, 'Fixture saved', 'ok');
}

// ---------------- lifecycle: Scheduled -> Live -> Completed ----------------
const STATUS_LABEL: Record<string, string> = { scheduled: 'Scheduled', live: 'Live', final: 'Completed', awaiting_confirmation: 'Awaiting confirmation', disputed: 'Disputed' };

/** Quick Scheduled <-> Live switch from the fixtures list. Completing needs the result page. */
export async function quickStatus(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const status = str(fd, 'status') as FixtureStatus;
  if (status !== 'live' && status !== 'scheduled') return redirect('/admin?error=Use the fixture page to complete a match');
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f) return redirect('/admin?error=That fixture no longer exists');
  if (f.status === 'final') return redirect('/admin?error=That match is Completed. Open it to change the result.');
  const r = await db.from('fixtures').update({ status, version: f.version + 1 }).eq('id', id).eq('version', f.version).select('id');
  if (r.error) return redirect(`/admin?error=${encodeURIComponent(r.error.message)}`);
  if (!r.data?.length) return redirect('/admin?error=Someone else changed that fixture. Please try again.');
  await audit(db, staff, 'fixture.status', `${f.status} -> ${status}`, undefined, id);
  refresh(); redirect(`/admin?ok=${encodeURIComponent(status === 'live' ? 'Match is now LIVE' : 'Match moved back to Scheduled')}`);
}

export async function setStatus(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const status = str(fd, 'status') as FixtureStatus; const reason = str(fd, 'reason');
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f) return redirect('/admin');
  if (!['scheduled', 'live', 'final'].includes(status)) return back(id, 'Unknown status');
  if (status === 'final') {
    const missing = SLOTS.filter((sl) => !f.pairings[sl].result);
    if (missing.length) return back(id, `Cannot mark as Completed yet: enter the result for ${missing.map((m) => slotLabel[m]).join(', ')} first. Only Completed fixtures count towards the table.`);
  }
  if (f.status === 'final' && status !== 'final' && !reason) return back(id, 'A reason is needed to reopen a Completed result.');
  const r = await db.from('fixtures').update({ status, version: f.version + 1 }).eq('id', id).eq('version', f.version).select('id');
  if (r.error) return back(id, r.error.message);
  if (!r.data?.length) return back(id, 'Someone else changed this fixture. Reload and try again.');
  await audit(db, staff, 'fixture.status', `${STATUS_LABEL[f.status] ?? f.status} -> ${STATUS_LABEL[status]}`, reason || undefined, id);
  await syncKnockouts(db, await loadStateFresh());
  refresh(); back(id, status === 'final' ? 'Completed. This result now counts towards the table.' : status === 'live' ? 'Match is now LIVE.' : 'Moved back to Scheduled.', 'ok');
}

// ---------------- pairings and scores ----------------
export async function savePairing(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const slot = str(fd, 'slot') as PairingSlot; const intent = str(fd, 'intent') || 'save';
  const s = await loadStateFresh(); const f = s.fixtures.find((x) => x.id === id);
  if (!f || !SLOTS.includes(slot)) return redirect('/admin');
  if (Number(fd.get('version')) !== f.version) return back(id, 'Someone else changed this fixture. Reload and try again.', 'error', slot);
  const wasFinal = f.status === 'final';
  const reason = str(fd, 'reason');

  const players = (side: 'home' | 'away') => [str(fd, `${side}1`), str(fd, `${side}2`)].filter(Boolean);
  const hp = players('home'), ap = players('away');
  const P = (pid: string) => s.players.find((x) => x.id === pid);
  const info = (ids: string[]) => ids.map((pid) => ({ id: pid, division: P(pid)?.division ?? ('high' as const), name: P(pid)?.name }));
  const setPlayers = hp.length > 0 || ap.length > 0;
  if (setPlayers) {
    // A pairing can be saved with 0, 1 or 2 players per side before the match (captains submit at different times);
    // every player who is chosen must still be eligible for the slot.
    const eligible = (ids: string[]) => (ids.length ? validatePairingPlayers(slot, info(ids)).filter((e) => !e.startsWith('A pairing needs exactly 2')) : []);
    const errs = [...eligible(hp), ...eligible(ap)];
    for (const [teamId, ids] of [[f.home, hp], [f.away, ap]] as const) {
      const others = s.fixtures.filter((x) => x.week === f.week && (x.home === teamId || x.away === teamId))
        .flatMap((x) => SLOTS.filter((sl) => !(x.id === f.id && sl === slot)).flatMap((sl) => [...x.pairings[sl].homePlayers, ...x.pairings[sl].awayPlayers]));
      for (const d of findDoubleBookings([{ slot, playerIds: [...ids] }], others)) errs.push(`${P(d)?.name ?? d} already plays another pairing this week`);
      for (const pid of ids) if (P(pid)?.teamId !== teamId) errs.push(`${P(pid)?.name ?? pid} is not on this team`);
    }
    if (errs.length) return back(id, errs.join('. '), 'error', slot);
  }

  // A save never needs a score: with the score boxes empty, "Save" just stores the players.
  const hasScoreInput = ['s1h', 's1a', 's2h', 's2a'].some((k) => num(fd.get(k)) !== undefined);
  const playersOnly = intent === 'players' || (intent === 'save' && !hasScoreInput);
  const clearing = intent === 'clear';
  const changingResult = !playersOnly;
  if (wasFinal && changingResult && !reason) return back(id, 'This match is Completed. Enter a reason to change its result.', 'error', slot);

  let result: PairingResult | undefined;
  if (changingResult && !clearing) {
    const set = (n: 1 | 2): SetScore | undefined => {
      const h = num(fd.get(`s${n}h`)), a = num(fd.get(`s${n}a`)); if (h === undefined || a === undefined) return undefined;
      const t = tb(num(fd.get(`s${n}tbh`)), num(fd.get(`s${n}tba`)));
      return { h, a, ...(t ? { tb: t } : {}) };
    };
    const m = /^(forfeit_match|walkover|forfeit_set)_(home|away)$/.exec(intent);
    if (m) {
      const winner = m[2] as Side;
      if (m[1] === 'forfeit_set') {
        const s2 = set(2); if (!s2) return back(id, 'Enter set 2 (and the tie-break if 1-1) for a late-first-set result', 'error', slot);
        result = forfeitFirstSet(winner, s2, tb(num(fd.get('mh')), num(fd.get('ma'))));
      } else result = forfeitMatch(winner, m[1] as 'forfeit_match' | 'walkover');
    } else {
      const s1 = set(1), s2 = set(2);
      if (!s1 || !s2) return back(id, 'Enter both set scores, or leave every score box empty to save the players only.', 'error', slot);
      result = { set1: s1, set2: s2, mtb: tb(num(fd.get('mh')), num(fd.get('ma'))), outcome: intent === 'retired' ? 'retired' : 'normal' };
    }
    const err = validatePairingResult(result);
    if (err) return back(id, err, 'error', slot);
  }

  // Entering a score means the match has started; clearing a result on a Completed match reopens it.
  let nextStatus: FixtureStatus = f.status;
  if (result && f.status === 'scheduled') nextStatus = 'live';
  if (clearing && wasFinal) nextStatus = 'live';
  const claim = await db.from('fixtures').update({ version: f.version + 1, status: nextStatus, ...(wasFinal && changingResult ? { corrected_at: new Date().toISOString() } : {}) }).eq('id', id).eq('version', f.version).select('id');
  if (claim.error) return back(id, claim.error.message, 'error', slot);
  if (!claim.data?.length) return back(id, 'Someone else changed this fixture. Reload and try again.', 'error', slot);

  const pr = await ensurePairing(db, f, slot, setPlayers ? { h: hp, a: ap } : undefined);
  if (pr.error) return back(id, pr.error, 'error', slot);
  if (clearing) {
    await db.from('pairing_results').delete().eq('pairing_id', pr.id!);
    await db.from('live_pairing_state').delete().eq('pairing_id', pr.id!);
  } else if (result) {
    const w = pairingPoints(result);
    const up = await db.from('pairing_results').upsert(resultToRow(pr.id!, result, { home: w.home, away: w.away }));
    if (up.error) return back(id, up.error.message, 'error', slot);
    await db.from('live_pairing_state').delete().eq('pairing_id', pr.id!);
  }
  await audit(db, staff, `pairing.${playersOnly ? 'players' : intent}`, `${slot}`, reason || undefined, id);
  await syncKnockouts(db, await loadStateFresh());
  refresh();
  back(id, playersOnly ? 'Players saved (no score needed).' : clearing ? (wasFinal ? 'Result cleared. The match is back to Live and no longer counts towards the table.' : 'Result cleared.') : wasFinal ? 'Result corrected. The table has been updated.' : 'Result saved. Mark the match as Completed when every pairing is entered.', 'ok', slot);
}

export async function saveLive(fd: FormData) {
  const { db, staff } = await requireStaffAction('scorer');
  const id = str(fd, 'id'); const slot = str(fd, 'slot') as PairingSlot;
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
  const id = str(fd, 'id'); const w = str(fd, 'winner');
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
  const text = str(fd, 'text').slice(0, 240);
  const s = await loadStateFresh();
  await db.from('announcements').delete().eq('season_id', s.seasonId);
  if (text) await db.from('announcements').insert({ season_id: s.seasonId, body: text });
  await audit(db, staff, 'announcement', text || '(cleared)');
  refresh(); redirect('/admin');
}

export async function setTvScene(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const v = str(fd, 'scene');
  const s = await loadStateFresh();
  const { data } = await db.from('seasons').select('settings').eq('id', s.seasonId).single();
  const settings = { ...((data?.settings as object) ?? {}), tvScene: v || null };
  await db.from('seasons').update({ settings }).eq('id', s.seasonId);
  await audit(db, staff, 'tv.scene', v || 'auto');
  refresh(); redirect('/admin');
}

export async function addPenalty(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const teamId = str(fd, 'teamId'); const points = Number(fd.get('points')); const reason = str(fd, 'reason');
  if (!teamId || !(points > 0) || !reason) redirect('/admin?error=Penalty needs a team, points and a reason');
  const s = await loadStateFresh();
  const r = await db.from('sanctions').insert({ season_id: s.seasonId, kind: 'point_penalty', team_id: s.teamUuid[teamId], points, reason, issued_by: staff.userId });
  if (r.error) redirect(`/admin?error=${encodeURIComponent(r.error.message)}`);
  await audit(db, staff, 'penalty', `${teamId} -${points}`, reason);
  refresh(); redirect('/admin');
}
