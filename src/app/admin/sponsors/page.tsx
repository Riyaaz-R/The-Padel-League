import Link from 'next/link';
import { ConfirmButton } from '@/components/ConfirmButton';
import { CHECKER } from '@/components/PhotoPicker';
import { loadSponsors, loadTiers, type SponsorRow } from '@/data/sponsors';
import { requireStaffPage } from '@/lib/auth';
import { TIER_SIZES, TIER_SIZE_LABEL } from '@/domain/sponsors';
import { addTier, deleteTier, moveSponsor, moveTier, saveTier, toggleSponsor } from './actions';

export const dynamic = 'force-dynamic';

function Arrow({ action, id, dir, label }: { action: (fd: FormData) => Promise<void>; id: string; dir: 'up' | 'down'; label: string }) {
  return (
    <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value={dir} />
      <button className="btn-ghost !min-h-[40px] !px-3" aria-label={label} title={label}>{dir === 'up' ? '↑' : '↓'}</button></form>
  );
}

function Row({ s }: { s: SponsorRow }) {
  return (
    <li className={`card flex flex-wrap items-center gap-3 ${s.active ? '' : 'opacity-70'}`}>
      <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line" style={s.logoUrl ? (s.logoBg === 'dark' ? { background: '#0a0d10' } : { background: '#fff' }) : CHECKER}>
        {s.logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={s.logoUrl} alt="" loading="lazy" className="max-h-12 max-w-[72px] object-contain" />
          : <span className="text-xs text-neutral-500">No logo</span>}
      </span>
      <div className="min-w-0 grow"><p className="truncate font-semibold">{s.name}</p>
        <p className="text-xs text-bone/60">{s.active ? 'Shown on the Sponsors page' : 'Hidden (switched off)'}{s.images.length ? ` · ${s.images.length} gallery image${s.images.length > 1 ? 's' : ''}` : ''}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Arrow action={moveSponsor} id={s.id} dir="up" label={`Move ${s.name} up`} /><Arrow action={moveSponsor} id={s.id} dir="down" label={`Move ${s.name} down`} />
        <form action={toggleSponsor}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="active" value={String(!s.active)} />
          <button className="btn-ghost !min-h-[40px] text-sm" aria-label={`${s.active ? 'Switch off' : 'Switch on'} ${s.name}`}>{s.active ? 'Switch off' : 'Switch on'}</button></form>
        <Link href={`/admin/sponsors/${s.id}`} className="btn !min-h-[40px] text-sm">Edit</Link>
      </div>
    </li>
  );
}

export default async function SponsorsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const [tiers, sponsors] = await Promise.all([loadTiers(db), loadSponsors(db)]);
  const noTier = sponsors.filter((s) => !s.tierId || !tiers.some((t) => t.id === s.tierId));
  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl">Manage Sponsors</h1><p className="text-sm text-bone/70">Shown on the public Sponsors page. Higher tiers are shown larger and at the top. {sponsors.length} sponsor{sponsors.length === 1 ? '' : 's'}.</p></div>
        <div className="flex gap-2"><Link href="/admin/banner" className="btn-ghost">Sponsor Banner</Link><Link href="/admin/sponsors/new" className="btn">+ Add sponsor</Link></div>
      </div>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}

      {sponsors.length === 0 && <p className="card text-bone/70">No sponsors yet. Add the first one with “+ Add sponsor”.</p>}
      {tiers.map((t) => {
        const list = sponsors.filter((s) => s.tierId === t.id);
        return list.length ? (<section key={t.id}><h2 className="slashes mb-2 text-2xl">{t.name}</h2><ul className="space-y-2">{list.map((s) => <Row key={s.id} s={s} />)}</ul></section>) : null;
      })}
      {noTier.length > 0 && <section><h2 className="slashes mb-2 text-2xl">No tier</h2><ul className="space-y-2">{noTier.map((s) => <Row key={s.id} s={s} />)}</ul></section>}

      <section id="tiers" className="scroll-mt-24 space-y-3">
        <h2 className="slashes text-2xl">Tiers</h2>
        <p className="text-sm text-bone/70">Rename the tiers, choose how big their cards are on the public page, and set their order. A tier can be deleted once no sponsor is in it.</p>
        <ul className="space-y-2">
          {tiers.map((t, i) => (
            <li key={t.id} className="card space-y-2">
              <form action={saveTier} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={t.id} />
                <label className="text-sm">Tier name<input name="name" required maxLength={40} defaultValue={t.name} className="input mt-1" /></label>
                <label className="text-sm">Card size<select name="size" defaultValue={t.size} className="input mt-1">{TIER_SIZES.map((z) => <option key={z} value={z}>{TIER_SIZE_LABEL[z]}</option>)}</select></label>
                <button className="btn">Save</button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                {i > 0 && <Arrow action={moveTier} id={t.id} dir="up" label={`Move ${t.name} up`} />}{i < tiers.length - 1 && <Arrow action={moveTier} id={t.id} dir="down" label={`Move ${t.name} down`} />}
                <form action={deleteTier}><input type="hidden" name="id" value={t.id} /><ConfirmButton className="btn-ghost !min-h-[40px] text-sm text-red-300" message={`Delete the tier “${t.name}”?`}>Delete tier</ConfirmButton></form>
              </div>
            </li>))}
        </ul>
        <form action={addTier} className="card grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm">New tier name<input name="name" required maxLength={40} className="input mt-1" placeholder="e.g. Kit sponsor" /></label>
          <label className="text-sm">Card size<select name="size" defaultValue="md" className="input mt-1">{TIER_SIZES.map((z) => <option key={z} value={z}>{TIER_SIZE_LABEL[z]}</option>)}</select></label>
          <button className="btn">Add tier</button>
        </form>
      </section>
    </div>
  );
}
