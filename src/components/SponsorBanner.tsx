'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { BannerView } from '@/data/sponsors';
import { SponsorMarquee } from './SponsorMarquee';

/**
 * The sponsor ticker fixed to the bottom of every public page. Hidden when there is nothing to show.
 * A spacer of the same height is added at the end of the page so content is never covered.
 * Not shown on the TV screen (it has the ticker built into its own layout) or in the staff area.
 */
export function SponsorBanner({ initial }: { initial: BannerView }) {
  const path = usePathname();
  const [data, setData] = useState(initial);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const r = await fetch('/api/sponsor-banner', { cache: 'no-store' }); if (r.ok && alive) setData((await r.json()) as BannerView); } catch { /* keep what we have */ }
    };
    const t = setInterval(load, 30000); // staff changes appear within about 30 seconds
    return () => { alive = false; clearInterval(t); };
  }, []);

  const hidden = path.startsWith('/tv') || path.startsWith('/admin') || path.startsWith('/staff');
  if (hidden || !data.enabled || data.items.length === 0) return null;
  return (
    <>
      <div className="sp-spacer no-print" aria-hidden="true" />
      <div className="sp-fixed no-print"><SponsorMarquee items={data.items} speed={data.speed} /></div>
    </>
  );
}
