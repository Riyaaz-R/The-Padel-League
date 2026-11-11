import Link from 'next/link';
import { StatusTag, team } from '@/components/ui';
import { SEASON } from '@/data/seed';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { fmtDate, roundLabel } from '@/lib/format';
import { quickStatus } from '../actions';

export const dynamic = 'force-dynamic';

export default async function FixturesAdmin({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  await requireStaffPage('committee');
  const s = await loadState();
  const live = s.fixtures.filter((f) => f.status === 'live').length;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Fixtures</h1>
          <p className="text-sm text-bone/70">{s.fixtures.length} fixtures{live > 0 ? ` · ${live} live now` : ''}. Go live, enter results, edit details or add a new fixture.</p>
        </div>
        <Link href="/admin/fixtures/new" className="btn">+ Add fixture</Link>
      </div>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}

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
                      <form action={quickStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="live" /><input type="hidden" name="return" value="/admin/fixtures" /><button className="btn !min-h-[40px] text-sm">Go live</button></form>)}
                    {f.status === 'live' && (<>
                      <Link href={`/admin/fixtures/${f.id}`} className="btn !min-h-[40px] text-sm">Enter result</Link>
                      <form action={quickStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="scheduled" /><input type="hidden" name="return" value="/admin/fixtures" /><button className="!min-h-[40px] rounded-xl border border-red-400 px-4 text-sm font-bold text-red-300 hover:bg-red-500/10">Stop live</button></form></>)}
                    {f.status === 'final' && <Link href={`/admin/fixtures/${f.id}`} className="btn-ghost !min-h-[40px] text-sm">View / correct result</Link>}
                    <Link href={`/admin/fixtures/${f.id}`} className="btn-ghost !min-h-[40px] text-sm">Edit</Link>
                  </div>
                </li>))}</ul>
            ) : <p className="text-sm text-bone/60">Created automatically as the previous round is completed, or add one with “Add fixture”.</p>}
          </section>
        );
      })}
    </div>
  );
}
