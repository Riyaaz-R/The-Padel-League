import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DivisionTag, StatusTag, team } from '@/components/ui';
import { SLOTS, type FixtureState, type PlayerRow } from '@/data/store';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { toRecord } from '@/data/derive';
import { allowedDivisions } from '@/domain/eligibility';
import { fixtureOutcome } from '@/domain/knockout';
import type { Division, PairingSlot } from '@/domain/types';
import { slotLabel } from '@/lib/format';
import { savePairing, saveFixtureMeta, setDeciding, setStatus } from '../../actions';

const slotDiv: Record<PairingSlot, Division> = { ladies: 'ladies', low: 'low', high_1: 'high', high_2: 'high' };
const n = 'input !min-h-[48px] !w-16 text-center text-lg';

function PlayerSelect({ players, name, teamId, slot, value }: { players: PlayerRow[]; name: string; teamId: string; slot: PairingSlot; value?: string }) {
  const ok = allowedDivisions(slot);
  return (
    <select name={name} defaultValue={value ?? ''} className="input" aria-label={name}>
      <option value="">Select player</option>
      {players.filter((p) => p.teamId === teamId && ok.includes(p.division)).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.division})</option>)}
    </select>
  );
}

function SlotForm({ f, slot, players }: { f: FixtureState; slot: PairingSlot; players: PlayerRow[] }) {
  const p = f.pairings[slot]; const r = p.result;
  return (
    <form id={slot} action={savePairing} className="card scroll-mt-24 space-y-3">
      <input type="hidden" name="id" value={f.id} /><input type="hidden" name="slot" value={slot} /><input type="hidden" name="version" value={f.version} />
      <div className="flex items-center gap-2"><DivisionTag d={slotDiv[slot]} /><h2 className="text-xl">{slotLabel[slot]} pairing</h2></div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2"><p className="text-sm text-bone/70">{team(f.home).name}</p>
          <PlayerSelect players={players} name="home1" teamId={f.home} slot={slot} value={p.homePlayers[0]} /><PlayerSelect players={players} name="home2" teamId={f.home} slot={slot} value={p.homePlayers[1]} /></div>
        <div className="space-y-2"><p className="text-sm text-bone/70">{team(f.away).name}</p>
          <PlayerSelect players={players} name="away1" teamId={f.away} slot={slot} value={p.awayPlayers[0]} /><PlayerSelect players={players} name="away2" teamId={f.away} slot={slot} value={p.awayPlayers[1]} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {([1, 2] as const).map((k) => { const sv = k === 1 ? r?.set1 : r?.set2; return (
          <fieldset key={k}><legend className="text-sm text-bone/70">Set {k} (home–away)</legend>
            <div className="flex items-center gap-1"><input name={`s${k}h`} defaultValue={sv?.h} inputMode="numeric" className={n} aria-label={`Set ${k} home games`} />–<input name={`s${k}a`} defaultValue={sv?.a} inputMode="numeric" className={n} aria-label={`Set ${k} away games`} /></div>
            <div className="mt-1 flex items-center gap-1 text-xs text-bone/60">7-6 tie-break <input name={`s${k}tbh`} defaultValue={sv?.tb?.h} inputMode="numeric" className="input !min-h-[40px] !w-14 text-center" aria-label={`Set ${k} tie-break home`} />–<input name={`s${k}tba`} defaultValue={sv?.tb?.a} inputMode="numeric" className="input !min-h-[40px] !w-14 text-center" aria-label={`Set ${k} tie-break away`} /></div></fieldset>); })}
        <fieldset><legend className="text-sm text-bone/70">Match tie-break to 10 (only at 1-1)</legend>
          <div className="flex items-center gap-1"><input name="mh" defaultValue={r?.mtb?.h} inputMode="numeric" className={n} aria-label="Match tie-break home" />–<input name="ma" defaultValue={r?.mtb?.a} inputMode="numeric" className={n} aria-label="Match tie-break away" /></div></fieldset>
      </div>
      {f.status === 'final' && <input name="reason" required placeholder="Reason for correction (required, audit-logged)" className="input" />}
      <div className="flex flex-wrap gap-2">
        <button name="intent" value="save" className="btn">Save score</button>
        <button name="intent" value="players" className="btn-ghost">Players only</button>
        <button name="intent" value="retired" className="btn-ghost" title="Interrupted set recorded 6-X by hand">Retired/injury</button>
        <button name="intent" value="clear" className="btn-ghost">Clear</button>
      </div>
      <details className="text-sm"><summary className="cursor-pointer text-bone/70">Forfeits and walkovers (rule 7)</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(['home', 'away'] as const).map((w) => (
            <div key={w} className="flex flex-wrap gap-2"><span className="w-full text-xs text-bone/60">{team(w === 'home' ? f.home : f.away).name} win by:</span>
              <button name="intent" value={`forfeit_match_${w}`} className="btn-ghost">30+ min late (6-0 6-0)</button>
              <button name="intent" value={`walkover_${w}`} className="btn-ghost">Walkover</button>
              <button name="intent" value={`forfeit_set_${w}`} className="btn-ghost" title="Uses the set 2 fields above">15 min late (set 1 6-0)</button></div>))}
        </div></details>
    </form>
  );
}

export default async function AdminFixture({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params; const { ok, error } = await searchParams;
  await requireStaffPage('committee');
  const s = await loadState();
  const f = s.fixtures.find((x) => x.id === id);
  if (!f) notFound();
  const out = fixtureOutcome(toRecord(f));
  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm text-bone/70 hover:text-lime">← All fixtures</Link>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl">{team(f.home).name} v {team(f.away).name}</h1><StatusTag status={f.status} /><span className="display text-2xl text-lime">{out.homePts}–{out.awayPts}</span></div>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      <form action={saveFixtureMeta} className="card flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={f.id} />
        <label className="text-sm">Date<input type="date" name="date" defaultValue={f.date} className="input mt-1" /></label>
        <label className="text-sm">Start time<input type="time" name="time" defaultValue={f.time} className="input mt-1" /></label>
        <label className="text-sm">Court<input name="court" defaultValue={f.court} className="input mt-1" /></label><button className="btn">Save</button></form>
      {SLOTS.map((slot) => <SlotForm key={slot} f={f} slot={slot} players={s.players} />)}
      {out.status === 'tied' && f.round !== 'group' && (
        <form action={setDeciding} className="card space-y-2 border-amber-400"><input type="hidden" name="id" value={f.id} />
          <h2 className="text-xl">Deciding set</h2><p className="text-sm">Level on points. Each captain nominates one eligible pairing; deciding set to 6 games (7-point tie-break at 6–6). Who won?</p>
          <select name="winner" defaultValue={f.decidingWinner ?? ''} className="input"><option value="">Not played</option><option value="home">{team(f.home).name}</option><option value="away">{team(f.away).name}</option></select><button className="btn">Record</button></form>
      )}
      <form action={setStatus} className="card flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={f.id} />
        <label className="text-sm">Result status<select name="status" defaultValue={f.status} className="input mt-1">
          <option value="scheduled">Scheduled</option><option value="live">Live (provisional)</option><option value="awaiting_confirmation">Awaiting confirmation</option><option value="final">Final (verified)</option><option value="disputed">Disputed</option></select></label>
        <label className="grow text-sm">Reason (needed to reopen a verified result)<input name="reason" className="input mt-1" /></label><button className="btn">Set status</button>
        <p className="w-full text-xs text-bone/60">Only Final results feed tables and the bracket. Captain confirmations and the second-approver rule arrive with team accounts.</p></form>
    </div>
  );
}
