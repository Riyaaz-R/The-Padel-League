import Link from 'next/link';
import { loadTiers } from '@/data/sponsors';
import { requireStaffPage } from '@/lib/auth';
import { SponsorForm } from '../SponsorForm';

export const dynamic = 'force-dynamic';

export default async function NewSponsor({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const tiers = await loadTiers(db);
  return (
    <div className="max-w-3xl">
      <Link href="/admin/sponsors" className="text-sm text-bone/70 hover:text-lime">← All sponsors</Link>
      <h1 className="mb-4 mt-2 text-3xl">Add a sponsor</h1>
      {error && <p role="alert" className="card mb-4 border-red-400 text-red-200">{error}</p>}
      <SponsorForm tiers={tiers} />
    </div>
  );
}
