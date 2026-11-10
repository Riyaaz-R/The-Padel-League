import Link from 'next/link';
import { StatusTag, team } from '@/components/ui';
import { groupTables } from '@/data/derive';
import { SEASON, TEAMS } from '@/data/seed';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { fmtDate, roundLabel } from '@/lib/format';
import { addAnnouncement, addPenalty, setTvScene } from './actions';

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const s = await loadState();
  const { data: audit } = await db.from('audit_log').select('at, action, after, reason').order('id', { ascending: false }).limit(50);
  const t = groupTables(s);
  const flagged = (['A', 'B'] as const).filter((g) => t[g].committeeRequired);
  return (
    <div className="space-y-8">
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      {flagged.length > 0 && <p className="card border-amber-400 text-amber-200">Committee decision required to separate tied teams in Group {flagged.join(' and ')}. (Manual ordering UI arrives with the committee module.)</p>}
      {SEASON.weeks.map((w) => {
        const list = s.fixtures.filter((f) => f.week === w.week);
        return (
          <section key={w.week}><h2 className="slashes mb-2 text-2xl">Week {w.week} · {fmtDate(w.date)} · {w.label}</h2>
            {list.length ? (
              <ul className="grid gap-2 md:grid-cols-2">{list.map((f) => (
                <li key={f.id}><Link href={`/admin/fixtures/${f.id}`} className="card flex items-center justify-between gap-2 hover:border-lime">
                  <span><span className="font-semibold">{team(f.home).name} v {team(f.away).name}</span><br /><span className="text-xs text-bone/60">{roundLabel[f.round]}{f.group ? ` · Group ${f.group}` : ''}{f.time ? ` · ${f.time}` : ''}{f.court ? ` · Court ${f.court}` : ''}</span></span>
                  <StatusTag status={f.status} /></Link></li>))}</ul>
            ) : <p className="text-sm text-bone/60">Created automatically as the previous round is verified.</p>}
          </section>
        );
      })}
      <div className="grid gap-6 md:grid-cols-3">
        <form action={addAnnouncement} className="card space-y-2"><h2 className="text-xl">Announcement banner</h2>
          <input name="text" maxLength={240} defaultValue={s.announcement} className="input" placeholder="Leave empty to clear" /><button className="btn">Publish</button></form>
        <form action={setTvScene} className="card space-y-2"><h2 className="text-xl">TV scene</h2>
          <select name="scene" defaultValue={s.tvScene ?? ''} className="input"><option value="">Auto-rotate</option>{['live', 'standings', 'next', 'results', 'bracket'].map((x) => <option key={x}>{x}</option>)}</select><button className="btn">Apply</button></form>
        <form action={addPenalty} className="card space-y-2"><h2 className="text-xl">Point penalty</h2>
          <select name="teamId" className="input">{TEAMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <input name="points" type="number" min={1} className="input" placeholder="Points" /><input name="reason" className="input" placeholder="Reason (shown in audit log)" /><button className="btn">Apply</button></form>
      </div>
      <section><h2 className="slashes mb-2 text-2xl">Audit log</h2>
        <div className="card max-h-80 overflow-auto text-sm">{audit?.length ? audit.map((a, i) => (
          <p key={i} className="border-b border-line py-1"><span className="text-bone/50">{new Date(a.at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</span> · {a.action} · {(a.after as { detail?: string } | null)?.detail}{a.reason ? <em> (reason: {a.reason})</em> : null}</p>)) : <p className="text-bone/60">No actions yet.</p>}</div></section>
    </div>
  );
}
