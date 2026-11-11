import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FixtureCard } from '@/components/FixtureCard';
import { DivisionTag, TeamBadge } from '@/components/ui';
import { SEASON } from '@/data/seed';
import { loadState } from '@/data/db';
import { groupTables } from '@/data/derive';
import { fmtRand } from '@/lib/format';
import type { Division } from '@/domain/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await loadState();
  const t = s.teams.find((x) => x.id === id);
  if (!t) notFound();
  const fixtures = s.fixtures.filter((f) => f.home === id || f.away === id);
  const row = t.group ? groupTables(s)[t.group].rows.find((r) => r.teamId === id) : undefined;
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5"><TeamBadge id={id} size={110} />
        <div><h1 className="text-5xl" style={t.colour ? { color: t.colour } : undefined}>{t.name}</h1>
          <p className="text-bone/70">{t.group ? `Group ${t.group}` : 'Not in a group'}{row ? ` · Position ${row.pos} · ${row.points - row.penalty} pts · ${row.played} played` : ''}</p>
          <p className="text-sm text-bone/60">Owner and captain: to be confirmed by the committee. Entry {fmtRand(SEASON.entryFee)}.</p></div></div>
      <section><h2 className="slashes mb-3 text-3xl">Roster</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(['ladies', 'high', 'low'] as Division[]).map((d) => (
            <div key={d} className="card"><DivisionTag d={d} />
              <ul className="mt-3 space-y-2">{s.players.filter((p) => p.teamId === id && p.division === d).map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  {p.photoUrl && <Image src={p.photoUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full border border-line object-cover" />}
                  <span>{p.name}</span>
                </li>))}</ul></div>
          ))}
        </div></section>
      <section><h2 className="slashes mb-3 text-3xl">Fixtures</h2><div className="grid gap-3 md:grid-cols-2">{fixtures.map((f) => <FixtureCard key={f.id} f={f} />)}</div></section>
    </div>
  );
}
