import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui';
import { SponsorGrid, type SponsorGroup } from '@/components/SponsorGrid';
import { loadSponsors, loadTiers } from '@/data/sponsors';

export const metadata: Metadata = { title: 'Sponsors', description: 'The businesses supporting the TPC Friday Night Team Padel League.' };
export const dynamic = 'force-dynamic';

export default async function Sponsors() {
  // row-level security means the public only ever receives active sponsors
  const [tiers, sponsors] = await Promise.all([loadTiers(), loadSponsors()]);
  const groups: SponsorGroup[] = tiers.map((t) => ({ tier: t, sponsors: sponsors.filter((s) => s.tierId === t.id) })).filter((g) => g.sponsors.length > 0);
  const known = new Set(tiers.map((t) => t.id));
  const loose = sponsors.filter((s) => !s.tierId || !known.has(s.tierId));
  if (loose.length) groups.push({ tier: { id: 'other', name: 'Sponsors', size: 'md' }, sponsors: loose });

  return (
    <div>
      <PageTitle sub="Thank you to the businesses that make the league possible.">Our sponsors</PageTitle>
      {groups.length === 0
        ? <div className="card text-center"><p className="display text-2xl">Sponsors coming soon</p><p className="mt-1 text-bone/70">We are lining up the businesses behind the league. Want your brand here? Ask the committee, listed on the About page.</p></div>
        : <SponsorGrid groups={groups} />}
    </div>
  );
}
