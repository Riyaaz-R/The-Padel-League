import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/ConfirmButton';
import { CHECKER } from '@/components/PhotoPicker';
import { loadSponsors, loadTiers } from '@/data/sponsors';
import { requireStaffPage } from '@/lib/auth';
import { deleteSponsor, removeSponsorImage } from '../actions';
import { SponsorForm } from '../SponsorForm';

export const dynamic = 'force-dynamic';

export default async function EditSponsor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params; const { ok, error } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const [tiers, sponsors] = await Promise.all([loadTiers(db), loadSponsors(db)]);
  const sponsor = sponsors.find((s) => s.id === id);
  if (!sponsor) notFound();
  const used = await db.from('banner_items').select('id', { count: 'exact', head: true }).eq('sponsor_id', id);
  const bannerCount = used.count ?? 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div><Link href="/admin/sponsors" className="text-sm text-bone/70 hover:text-lime">← All sponsors</Link>
        <h1 className="mt-2 text-3xl">{sponsor.name}</h1></div>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      <SponsorForm sponsor={sponsor} tiers={tiers} />

      <section id="gallery" className="card scroll-mt-24 space-y-3">
        <h2 className="text-xl">Gallery ({sponsor.images.length})</h2>
        {sponsor.images.length === 0 ? <p className="text-sm text-bone/70">No gallery images yet. Add some in the Gallery box above and save.</p> : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sponsor.images.map((img) => (
              <li key={img.id} className="space-y-2">
                <span className="block overflow-hidden rounded-xl border border-line" style={CHECKER}>
                  <Image src={img.url} alt={`Gallery image of ${sponsor.name}`} width={320} height={240} className="h-32 w-full object-contain" />
                </span>
                <form action={removeSponsorImage}><input type="hidden" name="id" value={img.id} /><input type="hidden" name="sponsor_id" value={sponsor.id} />
                  <ConfirmButton className="btn-ghost !min-h-[40px] w-full text-sm text-red-300" message="Remove this image?">Remove</ConfirmButton></form>
              </li>))}
          </ul>)}
      </section>

      <section className="card space-y-3 border-red-400/40">
        <h2 className="text-xl">Delete sponsor</h2>
        <p className="text-sm text-bone/70">
          This permanently removes {sponsor.name}, its logo and its gallery. Prefer switching it off if you might want it back.
          {bannerCount > 0 ? ` ${bannerCount} sliding-banner item${bannerCount > 1 ? 's use' : ' uses'} this sponsor and will be deleted too.` : ''}
        </p>
        <form action={deleteSponsor}><input type="hidden" name="id" value={sponsor.id} />
          <ConfirmButton className="btn-ghost text-red-300"
            message={`Delete ${sponsor.name}?${bannerCount > 0 ? ` ${bannerCount} banner item(s) that use it will also be deleted.` : ''} This cannot be undone.`}>Delete {sponsor.name}</ConfirmButton></form>
      </section>
    </div>
  );
}
