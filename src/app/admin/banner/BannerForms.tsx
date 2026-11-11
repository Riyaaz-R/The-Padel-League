'use client';
import { useState } from 'react';
import { PhotoPicker } from '@/components/PhotoPicker';
import { SponsorMarquee } from '@/components/SponsorMarquee';
import type { BannerItemView } from '@/data/sponsors';
import type { BannerSpeed } from '@/domain/sponsors';

export interface SponsorChoice { id: string; name: string; logoUrl?: string; logoBg: 'light' | 'dark' }

/** Global settings with a live preview of the saved items at the chosen speed (before saving). */
export function BannerSettingsForm({ enabled, speed, items, action }: { enabled: boolean; speed: BannerSpeed; items: BannerItemView[]; action: (fd: FormData) => Promise<void> }) {
  const [on, setOn] = useState(enabled);
  const [sp, setSp] = useState<BannerSpeed>(speed);
  return (
    <form action={action} className="card space-y-4">
      <h2 className="text-xl">Banner settings</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-6 w-6" /> <span><strong>Banner on</strong><br /><span className="text-xs text-bone/60">Off hides the banner from the whole public site and the TV.</span></span></label>
        <label className="block text-sm">Scroll speed
          <select name="speed" value={sp} onChange={(e) => setSp(e.target.value as BannerSpeed)} className="input mt-1"><option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option></select></label>
      </div>
      <div>
        <p className="mb-1 text-sm text-bone/70">Preview ({on ? 'banner on' : 'banner off: nothing will show'}, {sp} speed):</p>
        {items.length === 0 ? <p className="rounded-lg border border-dashed border-line p-3 text-sm text-bone/60">No active items yet. The banner stays hidden until you add one below.</p>
          : <div className={on ? '' : 'opacity-40'}><SponsorMarquee key={sp} items={items} speed={sp} className="rounded-lg !border !border-lime" /></div>}
      </div>
      <button className="btn">Save settings</button>
    </form>
  );
}

/** Add/edit one banner item, with a live preview of exactly how it will look. */
export function BannerItemForm({ action, sponsors, item, ownLogoUrl }: {
  action: (fd: FormData) => Promise<void>; sponsors: SponsorChoice[]; ownLogoUrl?: string;
  item?: { id: string; message: string; sponsorId: string | null; linkUrl: string; active: boolean; startsOn: string; endsOn: string; hasOwnLogo: boolean };
}) {
  const [message, setMessage] = useState(item?.message ?? '');
  const [sponsorId, setSponsorId] = useState(item?.sponsorId ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const [removeOwn, setRemoveOwn] = useState(false);
  const sponsor = sponsors.find((s) => s.id === sponsorId);
  const own = picked ?? (!removeOwn ? ownLogoUrl : undefined);
  const preview: BannerItemView = { id: 'preview', message: message.trim() || 'Your message will appear here', logoUrl: own ?? sponsor?.logoUrl, logoBg: own ? 'light' : sponsor?.logoBg ?? 'light' };

  return (
    <form action={action} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div><p className="mb-1 text-sm text-bone/70">Live preview:</p><SponsorMarquee key={preview.logoUrl ?? 'none'} items={[preview]} speed="medium" className="rounded-lg !border !border-lime" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">Message *<input name="message" required maxLength={160} value={message} onChange={(e) => setMessage(e.target.value)} className="input mt-1" placeholder="e.g. Proudly sponsored by TPC Café" autoComplete="off" /></label>
        <label className="block text-sm">Sponsor (uses its logo)
          <select name="sponsor_id" value={sponsorId} onChange={(e) => setSponsorId(e.target.value)} className="input mt-1"><option value="">No sponsor (message only, or upload a logo)</option>{sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="block text-sm">Link (optional)<input name="link_url" inputMode="url" defaultValue={item?.linkUrl} className="input mt-1" placeholder="https://example.com" autoComplete="off" /></label>
        <div className="sm:col-span-2 space-y-2">
          <PhotoPicker name="logo" label="Or upload a logo just for this item (optional)" maxSize={600} keepTransparency checker onPreview={setPicked} />
          {ownLogoUrl && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_logo" checked={removeOwn} onChange={(e) => setRemoveOwn(e.target.checked)} className="h-5 w-5" /> Remove the uploaded logo</label>}
        </div>
        <label className="block text-sm">Show from (optional)<input type="date" name="starts_on" defaultValue={item?.startsOn} className="input mt-1" /></label>
        <label className="block text-sm">Show until (optional)<input type="date" name="ends_on" defaultValue={item?.endsOn} className="input mt-1" /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="h-5 w-5" /> Active (switch off to hide it from the public site)</label>
      </div>
      <button className="btn">{item ? 'Save item' : 'Add to banner'}</button>
    </form>
  );
}
