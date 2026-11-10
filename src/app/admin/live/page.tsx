import { team } from '@/components/ui';
import { SLOTS } from '@/data/store';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { slotLabel } from '@/lib/format';
import { saveLive } from '../actions';

export default async function AdminLive({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  await requireStaffPage('scorer');
  const s = await loadState();
  const active = s.fixtures.filter((f) => f.status === 'live' || f.status === 'scheduled').slice(0, 8);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Live scoring</h1>
      <p className="text-sm text-bone/70">Update the current game score for a pairing; the TV and public pages refresh within seconds. Enter the final set scores on the fixture page when the match ends.</p>
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      {ok && <p role="status" className="card border-lime text-lime">Live score updated</p>}
      {active.map((f) => (
        <section key={f.id} className="card space-y-2"><h2 className="text-xl">{team(f.home).name} v {team(f.away).name}</h2>
          {SLOTS.filter((sl) => !f.pairings[sl].result).map((sl) => { const l = f.pairings[sl].live; return (
            <form key={sl} action={saveLive} className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
              <input type="hidden" name="id" value={f.id} /><input type="hidden" name="slot" value={sl} />
              <span className="w-20 font-semibold">{slotLabel[sl]}</span>
              <label className="text-xs">Set<select name="setNo" defaultValue={l?.setNo ?? 1} className="input !w-20"><option value={1}>1</option><option value={2}>2</option><option value={3}>MTB</option></select></label>
              <input name="gamesH" type="number" min={0} defaultValue={l?.gamesH ?? 0} className="input !w-20 text-center text-lg" aria-label="Home games" />–
              <input name="gamesA" type="number" min={0} defaultValue={l?.gamesA ?? 0} className="input !w-20 text-center text-lg" aria-label="Away games" />
              <label className="text-xs"><input type="checkbox" name="tiebreak" defaultChecked={l?.tiebreak} /> Tie-break</label>
              <button className="btn">Update</button></form>); })}
        </section>))}
    </div>
  );
}
