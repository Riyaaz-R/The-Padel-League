import type { Metadata } from 'next';
import Link from 'next/link';
import { FixtureCard } from '@/components/FixtureCard';
import { PageTitle } from '@/components/ui';
import { SEASON } from '@/data/seed';
import { loadState } from '@/data/db';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Fixtures & Results' };
export const dynamic = 'force-dynamic';

export default async function Fixtures({ searchParams }: { searchParams: Promise<{ team?: string; group?: string }> }) {
  const { team, group } = await searchParams;
  const s = await loadState();
  const fixtures = s.fixtures.filter((f) => (!team || f.home === team || f.away === team) && (!group || f.group === group));
  return (
    <div>
      <PageTitle sub="Every Friday at TPC. Times and courts are added by the committee.">Fixtures &amp; Results</PageTitle>
      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <label className="text-sm">Team
          <select name="team" defaultValue={team ?? ''} className="input mt-1"><option value="">All teams</option>{s.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm">Group
          <select name="group" defaultValue={group ?? ''} className="input mt-1"><option value="">Both</option><option>A</option><option>B</option></select></label>
        <button className="btn self-end">Filter</button>
        {(team || group) && <Link href="/fixtures" className="btn-ghost self-end">Clear</Link>}
      </form>
      {SEASON.weeks.map((w) => {
        const list = fixtures.filter((f) => f.week === w.week);
        return (
          <section key={w.week} className="mb-8">
            <h2 className="slashes mb-3 text-2xl">Week {w.week} · {fmtDate(w.date)} · {w.label}</h2>
            {list.length ? <div className="grid gap-3 md:grid-cols-2">{list.map((f) => <FixtureCard key={f.id} f={f} />)}</div>
              : <p className="text-bone/60">{w.week > 3 ? 'Set once the group stage is decided.' : 'No fixtures match this filter.'}</p>}
          </section>
        );
      })}
    </div>
  );
}
