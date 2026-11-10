import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTitle, TeamBadge } from '@/components/ui';
import { TEAMS } from '@/data/seed';

export const metadata: Metadata = { title: 'Teams' };

export default function Teams() {
  return (
    <div>
      <PageTitle>Teams</PageTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {TEAMS.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`} className="card-lime flex flex-col items-center gap-3 text-center hover:border-lime">
            <TeamBadge id={t.id} size={120} />
            <span className="display text-xl">{t.name}</span>
            <span className="text-xs uppercase tracking-widest text-bone/60">Group {t.group}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
