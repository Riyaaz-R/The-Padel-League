import Link from 'next/link';
import { ConfirmButton } from '@/components/ConfirmButton';
import { loadBannerAdmin, loadSponsors, type BannerItemView } from '@/data/sponsors';
import { requireStaffPage } from '@/lib/auth';
import { inWindow } from '@/domain/sponsors';
import { todaySAST } from '@/lib/format';
import { storageUrl } from '@/lib/media';
import { deleteBannerItem, moveBannerItem, saveBannerItem, saveBannerSettings, toggleBannerItem } from '../sponsors/actions';
import { BannerItemForm, BannerSettingsForm } from './BannerForms';

export const dynamic = 'force-dynamic';

export default async function BannerAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const [banner, sponsors] = await Promise.all([loadBannerAdmin(db), loadSponsors(db)]);
  const today = todaySAST();
  const sp = new Map(sponsors.map((s) => [s.id, s]));
  const choices = sponsors.map((s) => ({ id: s.id, name: s.name, logoUrl: s.logoUrl, logoBg: s.logoBg }));
  const toView = (i: (typeof banner.items)[number]): BannerItemView => {
    const s = i.sponsorId ? sp.get(i.sponsorId) : undefined;
    return { id: i.id, message: i.message, logoUrl: i.logoPath ? storageUrl('sponsor-images', i.logoPath) : s?.logoUrl, logoBg: s?.logoBg ?? 'light' };
  };
  const showing = banner.items.filter((i) => i.active && inWindow(i.startsOn, i.endsOn, today) && (!i.sponsorId || sp.get(i.sponsorId)?.active !== false));

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">Sponsor Banner</h1><p className="text-sm text-bone/70">The sliding strip along the bottom of every public page and the TV screen. Changes appear within about 30 seconds. With the banner off, or no active items, it is hidden completely.</p></div>
        <Link href="/admin/sponsors" className="btn-ghost">Manage Sponsors</Link>
      </div>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}

      <BannerSettingsForm enabled={banner.enabled} speed={banner.speed} items={showing.map(toView)} action={saveBannerSettings} />

      <section className="space-y-3">
        <h2 className="slashes text-2xl">Banner items ({banner.items.length})</h2>
        {banner.items.length === 0 && <p className="card text-bone/70">No items yet. Add your first one below.</p>}
        <ul className="space-y-3">
          {banner.items.map((i, idx) => {
            const live = i.active && inWindow(i.startsOn, i.endsOn, today);
            const status = !i.active ? ['Off', 'bg-line text-bone'] : i.startsOn && i.startsOn > today ? [`Starts ${i.startsOn}`, 'bg-amber-400 text-ink'] : i.endsOn && i.endsOn < today ? ['Ended', 'bg-line text-bone'] : ['Showing', 'bg-lime text-ink'];
            const s = i.sponsorId ? sp.get(i.sponsorId) : undefined;
            return (
              <li key={i.id} id={`item-${i.id}`} className={`card scroll-mt-24 space-y-3 ${live ? '' : 'opacity-80'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold">{i.message}</p>
                    <p className="text-xs text-bone/60">{s ? `Sponsor: ${s.name}` : i.logoPath ? 'Own logo' : 'Message only'}{i.linkUrl ? ' · has a link' : ''}{i.startsOn || i.endsOn ? ` · ${i.startsOn || '…'} to ${i.endsOn || '…'}` : ''}</p></div>
                  <span className={`tag ${status[1]}`}>{status[0]}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {idx > 0 && <form action={moveBannerItem}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="dir" value="up" /><button className="btn-ghost !min-h-[40px] !px-3" aria-label="Move up" title="Move up">↑</button></form>}
                  {idx < banner.items.length - 1 && <form action={moveBannerItem}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="dir" value="down" /><button className="btn-ghost !min-h-[40px] !px-3" aria-label="Move down" title="Move down">↓</button></form>}
                  <form action={toggleBannerItem}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="active" value={String(!i.active)} /><button className="btn-ghost !min-h-[40px] text-sm">{i.active ? 'Switch off' : 'Switch on'}</button></form>
                  <form action={deleteBannerItem}><input type="hidden" name="id" value={i.id} /><ConfirmButton className="btn-ghost !min-h-[40px] text-sm text-red-300" message="Delete this banner item? This cannot be undone.">Delete</ConfirmButton></form>
                </div>
                <details><summary className="cursor-pointer text-sm font-semibold text-lime">Edit this item</summary>
                  <div className="mt-3"><BannerItemForm action={saveBannerItem} sponsors={choices} ownLogoUrl={i.logoPath ? storageUrl('sponsor-images', i.logoPath) : undefined}
                    item={{ id: i.id, message: i.message, sponsorId: i.sponsorId, linkUrl: i.linkUrl, active: i.active, startsOn: i.startsOn, endsOn: i.endsOn, hasOwnLogo: Boolean(i.logoPath) }} /></div></details>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="new-item" className="card scroll-mt-24 space-y-3">
        <h2 className="text-2xl">Add a banner item</h2>
        <BannerItemForm action={saveBannerItem} sponsors={choices} />
      </section>
    </div>
  );
}
