import Link from 'next/link';
import { groupTables } from '@/data/derive';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { addAnnouncement, addPenalty, setTvScene } from './actions';

export const dynamic = 'force-dynamic';

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const s = await loadState();
  const { data: audit } = await db.from('audit_log').select('at, action, after, reason').order('id', { ascending: false }).limit(50);
  const t = groupTables(s);
  const flagged = (['A', 'B'] as const).filter((g) => t[g].committeeRequired);
  const live = s.fixtures.filter((f) => f.status === 'live').length;
  const tiles: [string, string, string][] = [
    ['/admin/fixtures', 'Fixtures', live > 0 ? `${live} live now` : `${s.fixtures.length} fixtures`],
    ['/admin/live', 'Live scoring', 'Update live game scores'],
    ['/admin/people', 'Players & Teams', `${s.players.length} players · ${s.teams.length} teams`],
    ['/admin/sponsors', 'Manage Sponsors', 'Sponsors page and tiers'],
    ['/admin/banner', 'Sponsor Banner', 'The sliding bottom banner'],
    ['/admin/lucky-draw', 'Lucky Draw winners', 'Weekly winners and photos'],
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Staff dashboard</h1>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      {flagged.length > 0 && <p className="card border-amber-400 text-amber-200">Committee decision required to separate tied teams in Group {flagged.join(' and ')}. (Manual ordering UI arrives with the committee module.)</p>}

      <nav aria-label="Staff sections"><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([href, title, sub]) => (
          <li key={href}><Link href={href} className={`card-lime block h-full hover:border-lime ${title === 'Fixtures' && live > 0 ? '!border-red-500' : ''}`}>
            <span className="display text-2xl">{title}</span><span className="block text-sm text-bone/70">{sub}</span></Link></li>))}
      </ul></nav>

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
