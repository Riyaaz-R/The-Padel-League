import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTitle, TeamBadge } from '@/components/ui';
import { loadState } from '@/data/db';

export const metadata: Metadata = { title: 'Teams' };
export const dynamic = 'force-dynamic';

export default async function Teams() {
  const { teams } = await loadState();
  return (
    <div>
      <PageTitle>Teams</PageTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {teams.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`} className="card-lime flex flex-col items-center gap-3 text-center hover:border-lime" style={t.colour ? { borderTopColor: t.colour, borderTopWidth: 4 } : undefined}>
            <TeamBadge id={t.id} size={120} />
            <span className="display text-xl">{t.name}</span>
            {t.group && <span className="text-xs uppercase tracking-widest text-bone/60">Group {t.group}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
