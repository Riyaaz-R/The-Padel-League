import Link from 'next/link';
import { StatusTag, team } from '@/components/ui';
import { groupTables } from '@/data/derive';
import { SEASON } from '@/data/seed';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { fmtDate, roundLabel } from '@/lib/format';
import { addAnnouncement, addPenalty, quickStatus, setTvScene } from './actions';

export const dynamic = 'force-dynamic';

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const s = await loadState();
  const { data: audit } = await db.from('audit_log').select('at, action, after, reason').order('id', { ascending: false }).limit(50);
  const t = groupTables(s);
  const flagged = (['A', 'B'] as const).filter((g) => t[g].committeeRequired);
  return (
    <div className="space-y-8">
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      {flagged.length > 0 && <p className="card border-amber-400 text-amber-200">Committee decision required to separate tied teams in Group {flagged.join(' and ')}. (Manual ordering UI arrives with the committee module.)</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Fixtures</h1>
        <Link href="/admin/fixtures/new" className="btn">+ Add fixture</Link>
      </div>
      {SEASON.weeks.map((w) => {
        const list = s.fixtures.filter((f) => f.week === w.week);
        return (
          <section key={w.week}><h2 className="slashes mb-2 text-2xl">Week {w.week} · {fmtDate(w.date)} · {w.label}</h2>
            {list.length ? (
              <ul className="grid gap-2 md:grid-cols-2">{list.map((f) => (
                <li key={f.id} className={`card space-y-3 ${f.status === 'live' ? '!border-red-500' : ''}`}>
                  <Link href={`/admin/fixtures/${f.id}`} className="flex items-center justify-between gap-2 hover:text-lime">
                    <span><span className="font-semibold">{team(f.home).name} v {team(f.away).name}</span><br />
                      <span className="text-xs text-bone/60">{roundLabel[f.round]}{f.group ? ` · Group ${f.group}` : ''}{f.date !== w.date ? ` · ${fmtDate(f.date)}` : ''}{f.time ? ` · ${f.time}` : ''}{f.court ? ` · Court ${f.court}` : ''}</span></span>
                    <StatusTag status={f.status} />
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    {f.status === 'scheduled' && (
                      <form action={quickStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="live" /><button className="btn !min-h-[40px] text-sm">Go live</button></form>)}
                    {f.status === 'live' && (<>
                      <Link href={`/admin/fixtures/${f.id}`} className="btn !min-h-[40px] text-sm">Enter result</Link>
                      <form action={quickStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="scheduled" /><button className="btn-ghost !min-h-[40px] text-sm">Back to Scheduled</button></form></>)}
                    {f.status === 'final' && <Link href={`/admin/fixtures/${f.id}`} className="btn-ghost !min-h-[40px] text-sm">View / correct result</Link>}
                    <Link href={`/admin/fixtures/${f.id}`} className="btn-ghost !min-h-[40px] text-sm">Edit</Link>
                  </div>
                </li>))}</ul>
            ) : <p className="text-sm text-bone/60">Created automatically as the previous round is completed, or add one with “Add fixture”.</p>}
          </section>
        );
      })}
      <div className="grid gap-6 md:grid-cols-3">
        <form action={addAnnouncement} className="card space-y-2"><h2 className="text-xl">Announcement banner</h2>
          <input name="text" maxLength={240} defaultValue={s.announcement} className="input" placeholder="Leave empty to clear" /><button className="btn">Publish</button></form>
        <form action={setTvScene} className="card space-y-2"><h2 className="text-xl">TV scene</h2>
          <select name="scene" defaultValue={s.tvScene ?? ''} className="input"><option value="">Live scores only (default)</option><option value="rotate">Rotate: scores, tables, up next, results, bracket</option>{['standings', 'next', 'results', 'bracket'].map((x) => <option key={x} value={x}>Show only: {x}</option>)}</select><button className="btn">Apply</button></form>
        <form action={addPenalty} className="card space-y-2"><h2 className="text-xl">Point penalty</h2>
          <select name="teamId" className="input">{s.teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input name="points" type="number" min={1} className="input" placeholder="Points" /><input name="reason" className="input" placeholder="Reason (shown in audit log)" /><button className="btn">Apply</button></form>
      </div>
      <section><h2 className="slashes mb-2 text-2xl">Audit log</h2>
        <div className="card max-h-80 overflow-auto text-sm">{audit?.length ? audit.map((a, i) => (
          <p key={i} className="border-b border-line py-1"><span className="text-bone/50">{new Date(a.at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</span> · {a.action} · {(a.after as { detail?: string } | null)?.detail}{a.reason ? <em> (reason: {a.reason})</em> : null}</p>)) : <p className="text-bone/60">No actions yet.</p>}</div></section>
    </div>
  );
}
