import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/ConfirmButton';
import { DivisionTag, StatusTag, team } from '@/components/ui';
import { SLOTS, type FixtureState, type PlayerRow, type TeamRow } from '@/data/store';
import { loadState } from '@/data/db';
import { SEASON } from '@/data/seed';
import { requireStaffPage } from '@/lib/auth';
import { toRecord } from '@/data/derive';
import { allowedDivisions } from '@/domain/eligibility';
import { fixtureOutcome } from '@/domain/knockout';
import type { Division, PairingSlot } from '@/domain/types';
import { roundLabel, slotLabel } from '@/lib/format';
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
  const completed = f.status === 'final';
  const warn = 'This match is Completed. Changing its result will change the table. Continue?';
  return (
    <form id={slot} action={savePairing} className="card scroll-mt-24 space-y-3">
      <input type="hidden" name="id" value={f.id} /><input type="hidden" name="slot" value={slot} /><input type="hidden" name="version" value={f.version} />
      {/* each button below sets this before the form is sent */}
      <input type="hidden" name="intent" defaultValue="save" />
      <div className="flex items-center gap-2"><DivisionTag d={slotDiv[slot]} /><h2 className="text-xl">{slotLabel[slot]} pairing</h2></div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2"><p className="text-sm text-bone/70">{team(f.home).name}</p>
          <PlayerSelect players={players} name="home1" teamId={f.home} slot={slot} value={p.homePlayers[0]} /><PlayerSelect players={players} name="home2" teamId={f.home} slot={slot} value={p.homePlayers[1]} /></div>
        <div className="space-y-2"><p className="text-sm text-bone/70">{team(f.away).name}</p>
          <PlayerSelect players={players} name="away1" teamId={f.away} slot={slot} value={p.awayPlayers[0]} /><PlayerSelect players={players} name="away2" teamId={f.away} slot={slot} value={p.awayPlayers[1]} /></div>
      </div>
      <p className="text-xs text-bone/60">Scores are optional. Leave the score boxes empty to save just the players before the match.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {([1, 2] as const).map((k) => { const sv = k === 1 ? r?.set1 : r?.set2; return (
          <fieldset key={k}><legend className="text-sm text-bone/70">Set {k} (home–away)</legend>
            <div className="flex items-center gap-1"><input name={`s${k}h`} defaultValue={sv?.h} inputMode="numeric" className={n} aria-label={`Set ${k} home games`} />–<input name={`s${k}a`} defaultValue={sv?.a} inputMode="numeric" className={n} aria-label={`Set ${k} away games`} /></div>
            <div className="mt-1 flex items-center gap-1 text-xs text-bone/60">7-6 tie-break <input name={`s${k}tbh`} defaultValue={sv?.tb?.h} inputMode="numeric" className="input !min-h-[40px] !w-14 text-center" aria-label={`Set ${k} tie-break home`} />–<input name={`s${k}tba`} defaultValue={sv?.tb?.a} inputMode="numeric" className="input !min-h-[40px] !w-14 text-center" aria-label={`Set ${k} tie-break away`} /></div></fieldset>); })}
        <fieldset><legend className="text-sm text-bone/70">Match tie-break to 10 (only at 1-1)</legend>
          <div className="flex items-center gap-1"><input name="mh" defaultValue={r?.mtb?.h} inputMode="numeric" className={n} aria-label="Match tie-break home" />–<input name="ma" defaultValue={r?.mtb?.a} inputMode="numeric" className={n} aria-label="Match tie-break away" /></div></fieldset>
      </div>
      {completed && <input name="reason" placeholder="Reason for changing a Completed result (audit-logged)" className="input" />}
      <div className="flex flex-wrap gap-2">
        <ConfirmButton name="intent" value="save" className="btn" message={completed ? warn : undefined}>Save</ConfirmButton>
        <ConfirmButton name="intent" value="retired" title="Interrupted set recorded 6-X by hand" message={completed ? warn : undefined}>Retired/injury</ConfirmButton>
        <ConfirmButton name="intent" value="clear" message={completed ? warn : undefined}>Clear result</ConfirmButton>
      </div>
      <details className="text-sm"><summary className="cursor-pointer text-bone/70">Forfeits and walkovers (rule 7)</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(['home', 'away'] as const).map((w) => (
            <div key={w} className="flex flex-wrap gap-2"><span className="w-full text-xs text-bone/60">{team(w === 'home' ? f.home : f.away).name} win by:</span>
              <ConfirmButton name="intent" value={`forfeit_match_${w}`} message={completed ? warn : undefined}>30+ min late (6-0 6-0)</ConfirmButton>
              <ConfirmButton name="intent" value={`walkover_${w}`} message={completed ? warn : undefined}>Walkover</ConfirmButton>
              <ConfirmButton name="intent" value={`forfeit_set_${w}`} title="Uses the set 2 fields above" message={completed ? warn : undefined}>15 min late (set 1 6-0)</ConfirmButton></div>))}
        </div></details>
    </form>
  );
}

function Lifecycle({ f, allResults }: { f: FixtureState; allResults: boolean }) {
  const steps = [['scheduled', 'Scheduled'], ['live', 'Live'], ['final', 'Completed']] as const;
  const idx = steps.findIndex(([k]) => k === f.status);
  return (
    <section className="card space-y-3" aria-label="Match status">
      <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        {steps.map(([k, label], i) => (
          <li key={k} className="flex items-center gap-2">
            <span className={`tag ${i === idx ? (k === 'live' ? 'bg-red-500 text-white' : 'bg-lime') : 'bg-line text-bone/70'}`}>{label}</span>{i < steps.length - 1 && <span aria-hidden="true" className="text-bone/40">→</span>}
          </li>))}
        {idx < 0 && <li><StatusTag status={f.status} /></li>}
      </ol>
      {f.status === 'scheduled' && (
        <form action={setStatus} className="space-y-2"><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="live" />
          <button className="btn">Go live (start match)</button>
          <p className="text-xs text-bone/60">Shows the red LIVE badge on the fixtures page, home page and live screen. Scheduled and Live matches do not count towards the table.</p></form>)}
      {f.status === 'live' && (
        <div className="space-y-3">
          <form action={setStatus} className="space-y-2"><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="final" />
            <button className="btn">Save result / Mark as completed</button>
            <p className="text-xs text-bone/60">{allResults ? 'All four pairings have a result. Completing the match counts it towards the table.' : 'Enter the result of every pairing below first. Then complete the match and it will count towards the table.'}</p></form>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/live" className="btn-ghost">Update live score</Link>
            <form action={setStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="scheduled" /><button className="rounded-xl border border-red-400 px-5 py-3 font-bold text-red-300 hover:bg-red-500/10">Stop live (back to Scheduled)</button></form>
          </div>
        </div>)}
      {f.status === 'final' && (
        <form action={setStatus} className="space-y-2"><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" defaultValue="live" />
          <p className="text-sm text-bone/80">This match counts towards the table. To correct a mistake, reopen it (its result stops counting until you complete it again) or edit a pairing result below with a reason.</p>
          <input name="reason" required placeholder="Reason for reopening (audit-logged)" className="input" />
          <div className="flex flex-wrap gap-2">
            <ConfirmButton name="status" value="live" message="Reopen this Completed match as Live? Its result will stop counting towards the table until it is completed again.">Reopen as Live</ConfirmButton>
            <ConfirmButton name="status" value="scheduled" message="Move this Completed match back to Scheduled? Its result will stop counting towards the table.">Back to Scheduled</ConfirmButton>
          </div></form>)}
      {(f.status === 'awaiting_confirmation' || f.status === 'disputed') && (
        <form action={setStatus} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" defaultValue="final" />
          <ConfirmButton name="status" value="final" className="btn">Mark as completed</ConfirmButton><ConfirmButton name="status" value="live">Back to Live</ConfirmButton></form>)}
    </section>
  );
}

function DetailsForm({ f, teams }: { f: FixtureState; teams: TeamRow[] }) {
  const locked = Boolean(f.slot);
  return (
    <form action={saveFixtureMeta} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="id" value={f.id} />
      <h2 className="text-xl sm:col-span-2 lg:col-span-4">Fixture details</h2>
      <label className="text-sm">Round<select name="round" defaultValue={f.round} disabled={locked} className="input mt-1">{Object.entries(roundLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-sm">Group (group stage)<select name="group" defaultValue={f.group ?? ''} disabled={locked} className="input mt-1"><option value="">–</option><option value="A">Group A</option><option value="B">Group B</option></select></label>
      <label className="text-sm">Week<select name="week" defaultValue={f.week} disabled={locked} className="input mt-1">{SEASON.weeks.map((w) => <option key={w.week} value={w.week}>Week {w.week}</option>)}</select></label>
      <label className="text-sm">Date<input type="date" name="date" defaultValue={f.date} required className="input mt-1" /></label>
      <label className="text-sm">Home team<select name="home" defaultValue={f.home} disabled={locked} className="input mt-1">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label className="text-sm">Away team<select name="away" defaultValue={f.away} disabled={locked} className="input mt-1">{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label className="text-sm">Start time<input type="time" name="time" defaultValue={f.time} className="input mt-1" /></label>
      <label className="text-sm">Court<input name="court" defaultValue={f.court} maxLength={20} className="input mt-1" /></label>
      {locked && <p className="text-xs text-bone/60 sm:col-span-2 lg:col-span-4">This knockout fixture was created from the bracket, so its round and teams are fixed. You can change the date, time and court.</p>}
      <div className="sm:col-span-2 lg:col-span-4"><button className="btn">Save fixture details</button></div>
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
  const allResults = SLOTS.every((sl) => f.pairings[sl].result);
  return (
    <div className="space-y-5">
      <Link href="/admin/fixtures" className="text-sm text-bone/70 hover:text-lime">← All fixtures</Link>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl">{team(f.home).name} v {team(f.away).name}</h1><StatusTag status={f.status} />
        <span className="display text-2xl text-lime">{f.status === 'scheduled' ? 'vs' : `${out.homePts}–${out.awayPts}`}</span></div>
      <p className="text-sm text-bone/70">{roundLabel[f.round]}{f.group ? ` · Group ${f.group}` : ''} · Week {f.week}</p>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      <Lifecycle f={f} allResults={allResults} />
      <DetailsForm f={f} teams={s.teams} />
      {SLOTS.map((slot) => <SlotForm key={slot} f={f} slot={slot} players={s.players} />)}
      {out.status === 'tied' && f.round !== 'group' && (
        <form action={setDeciding} className="card space-y-2 border-amber-400"><input type="hidden" name="id" value={f.id} />
          <h2 className="text-xl">Deciding set</h2><p className="text-sm">Level on points. Each captain nominates one eligible pairing; deciding set to 6 games (7-point tie-break at 6–6). Who won?</p>
          <select name="winner" defaultValue={f.decidingWinner ?? ''} className="input"><option value="">Not played</option><option value="home">{team(f.home).name}</option><option value="away">{team(f.away).name}</option></select><button className="btn">Record</button></form>
      )}
    </div>
  );
}
