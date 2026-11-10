import type { Metadata } from 'next';
import Link from 'next/link';
import { DivisionTag, PageTitle, team } from '@/components/ui';
import { loadState } from '@/data/db';

export const metadata: Metadata = { title: 'Players' };

export default async function Players({ searchParams }: { searchParams: Promise<{ q?: string; d?: string }> }) {
  const { q = '', d = '' } = await searchParams;
  const { players } = await loadState();
  const list = players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) && (!d || p.division === d))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <PageTitle sub={`${list.length} players. Contact details are never shown publicly.`}>Players</PageTitle>
      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <label className="text-sm">Search<input name="q" defaultValue={q} className="input mt-1" placeholder="Name" /></label>
        <label className="text-sm">Division
          <select name="d" defaultValue={d} className="input mt-1"><option value="">All</option><option value="ladies">Ladies</option><option value="high">High</option><option value="low">Low</option></select></label>
        <button className="btn self-end">Search</button>
      </form>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.id} className="card flex items-center justify-between gap-2">
            <span><span className="font-semibold">{p.name}</span><br /><Link href={`/teams/${p.teamId}`} className="text-sm text-bone/70 hover:text-lime">{team(p.teamId).name}</Link></span>
            <DivisionTag d={p.division} />
          </li>
        ))}
      </ul>
    </div>
  );
}
