import { MultiImagePicker } from '@/components/MultiImagePicker';
import { CHECKER, PhotoPicker } from '@/components/PhotoPicker';
import type { SponsorRow, Tier } from '@/data/sponsors';
import { SOCIAL_KEYS, SOCIAL_LABEL } from '@/domain/sponsors';
import { saveSponsor } from './actions';

/** Add/edit form for a sponsor (single column on phones). The gallery list and delete live outside this form. */
export function SponsorForm({ sponsor, tiers }: { sponsor?: SponsorRow; tiers: Tier[] }) {
  return (
    <form action={saveSponsor} className="space-y-6">
      {sponsor && <input type="hidden" name="id" value={sponsor.id} />}

      <fieldset className="card grid gap-3 sm:grid-cols-2">
        <legend className="px-1 text-lg">About</legend>
        <label className="block text-sm">Sponsor name *<input name="name" required maxLength={80} defaultValue={sponsor?.name} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm">Tier<select name="tier_id" defaultValue={sponsor?.tierId ?? tiers[tiers.length - 1]?.id ?? ''} className="input mt-1"><option value="">No tier</option>{tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="block text-sm sm:col-span-2">Short description<textarea name="description" rows={4} maxLength={1000} defaultValue={sponsor?.description} className="input mt-1 !min-h-[110px] py-2" /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={sponsor?.active ?? true} className="h-5 w-5" /> Active (shown on the public Sponsors page)</label>
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="px-1 text-lg">Logo</legend>
        {sponsor?.logoUrl && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-24 w-40 items-center justify-center rounded-xl border border-line" style={CHECKER}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sponsor.logoUrl} alt={`Current logo of ${sponsor.name}`} className="max-h-20 max-w-[9rem] object-contain" /></span>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_logo" className="h-5 w-5" /> Remove this logo</label>
          </div>)}
        <PhotoPicker name="logo" label={sponsor?.logoUrl ? 'Replace logo (optional)' : 'Logo (optional)'} maxSize={1200} keepTransparency checker />
        <label className="block text-sm sm:max-w-xs">Logo background on the website
          <select name="logo_bg" defaultValue={sponsor?.logoBg ?? 'light'} className="input mt-1"><option value="light">Light (white) — for dark or coloured logos</option><option value="dark">Dark — for white or light logos</option></select></label>
        <p className="text-xs text-bone/60">Transparent backgrounds are kept. The background choice makes sure the logo is readable on the dark site.</p>
      </fieldset>

      <fieldset className="card grid gap-3 sm:grid-cols-2">
        <legend className="px-1 text-lg">Contact and links</legend>
        <label className="block text-sm">Website<input name="website" inputMode="url" defaultValue={sponsor?.website} className="input mt-1" placeholder="https://example.com" autoComplete="off" /></label>
        <label className="block text-sm">Phone<input name="phone" type="tel" defaultValue={sponsor?.phone} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm">Email<input name="email" type="email" defaultValue={sponsor?.email} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm">Address / location<input name="address" maxLength={300} defaultValue={sponsor?.address} className="input mt-1" autoComplete="off" /></label>
        {SOCIAL_KEYS.map((k) => (
          <label key={k} className="block text-sm">{SOCIAL_LABEL[k]} link<input name={`social_${k}`} inputMode="url" defaultValue={sponsor?.socials[k]} className="input mt-1" placeholder="https://…" autoComplete="off" /></label>))}
        <p className="text-xs text-bone/60 sm:col-span-2">Only web addresses starting with http:// or https:// are accepted.</p>
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="px-1 text-lg">Gallery</legend>
        <MultiImagePicker />
      </fieldset>

      <button className="btn w-full sm:w-auto">{sponsor ? 'Save sponsor' : 'Add sponsor'}</button>
    </form>
  );
}
