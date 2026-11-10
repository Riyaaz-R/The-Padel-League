import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FixtureCard } from '@/components/FixtureCard';
import { DivisionTag, TeamBadge } from '@/components/ui';
import { TEAMS } from '@/data/seed';
import { loadState } from '@/data/db';
import { groupTables } from '@/data/derive';
import { fmtRand } from '@/lib/format';
import type { Division } from '@/domain/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = TEAMS.find((x) => x.id === id);
  if (!t) notFound();
  const s = await loadState();
  const fixtures = s.fixtures.filter((f) => f.home === id || f.away === id);
  const row = groupTables(s)[t.group].rows.find((r) => r.teamId === id)!;
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5"><TeamBadge id={id} size={110} />
        <div><h1 className="text-5xl">{t.name}</h1><p className="text-bone/70">Group {t.group} · Position {row.pos} · {row.points - row.penalty} pts · {row.played} played</p>
          <p className="text-sm text-bone/60">Owner and captain: {t.owner ? t.owner : 'to be confirmed by the committee'}. Entry {fmtRand(8000)}.</p></div></div>
      <section><h2 className="slashes mb-3 text-3xl">Roster</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(['ladies', 'high', 'low'] as Division[]).map((d) => (
            <div key={d} className="card"><DivisionTag d={d} />
              <ul className="mt-3 space-y-1">{s.players.filter((p) => p.teamId === id && p.division === d).map((p) => <li key={p.id}>{p.name}</li>)}</ul></div>
          ))}
        </div></section>
      <section><h2 className="slashes mb-3 text-3xl">Fixtures</h2><div className="grid gap-3 md:grid-cols-2">{fixtures.map((f) => <FixtureCard key={f.id} f={f} />)}</div></section>
    </div>
  );
}
