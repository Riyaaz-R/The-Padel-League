import { team } from '@/components/ui';
import { SLOTS } from '@/data/store';
import { loadState } from '@/data/db';
import { isCommittee, requireStaffPage } from '@/lib/auth';
import { slotLabel } from '@/lib/format';
import { quickStatus, saveLive } from '../actions';

export default async function AdminLive({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const { staff } = await requireStaffPage('scorer');
  const committee = isCommittee(staff);
  const s = await loadState();
  // every LIVE match first (several can be on at once), then the next few Scheduled ones
  const active = [...s.fixtures.filter((f) => f.status === 'live'), ...s.fixtures.filter((f) => f.status === 'scheduled').slice(0, 8)];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Live scoring</h1>
      <p className="text-sm text-bone/70">Update the current game score for a pairing; the TV and public pages refresh within seconds. Enter the final set scores on the fixture page when the match ends.</p>
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      {ok && <p role="status" className="card border-lime text-lime">{ok === '1' ? 'Live score updated' : ok}</p>}
      {active.map((f) => (
        <section key={f.id} className={`card space-y-2 ${f.status === 'live' ? '!border-red-500' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">{f.status === 'live' && <span className="mr-2 text-sm text-red-400">● LIVE</span>}{team(f.home).name} v {team(f.away).name}</h2>
            {committee && <form action={quickStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="return" value="/admin/live" /><input type="hidden" name="status" value={f.status === 'live' ? 'scheduled' : 'live'} />
              {f.status === 'live' ? <button className="rounded-xl border border-red-400 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10">Stop live</button> : <button className="btn !min-h-[40px] text-sm">Go live</button>}</form>}</div>
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
