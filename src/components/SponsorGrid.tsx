'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { SOCIAL_LABEL, telHref, type TierSize } from '@/domain/sponsors';
import type { SponsorRow, Tier } from '@/data/sponsors';

export interface SponsorGroup { tier: Pick<Tier, 'id' | 'name' | 'size'>; sponsors: SponsorRow[] }

const GRID: Record<TierSize, string> = {
  xl: 'grid-cols-1',
  lg: 'grid-cols-1 sm:grid-cols-2',
  md: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  sm: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};
const LOGO_H: Record<TierSize, string> = { xl: 'h-44 sm:h-56', lg: 'h-36 sm:h-40', md: 'h-28 sm:h-32', sm: 'h-20 sm:h-24' };
const NAME: Record<TierSize, string> = { xl: 'text-4xl', lg: 'text-3xl', md: 'text-2xl', sm: 'text-lg' };

const logoBg = (s: SponsorRow) => (s.logoBg === 'dark' ? 'bg-[#0a0d10] border-line' : 'bg-white border-white/20');
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function Logo({ s, className }: { s: SponsorRow; className: string }) {
  return (
    <span className={`flex items-center justify-center overflow-hidden rounded-xl border p-3 ${logoBg(s)} ${className}`}>
      {s.logoUrl
        ? <Image src={s.logoUrl} alt={`${s.name} logo`} width={600} height={300} sizes="(max-width: 640px) 80vw, 400px" className="max-h-full w-auto max-w-full object-contain" />
        : <span aria-hidden="true" className="display text-4xl text-neutral-400">{s.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

function Detail({ s, tierName, onClose }: { s: SponsorRow; tierName?: string; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !root.current) return;
      const f = [...root.current.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const socials = Object.entries(s.socials) as [keyof typeof SOCIAL_LABEL, string][];
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={root} role="dialog" aria-modal="true" aria-label={s.name} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-card p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>{tierName && <p className="text-xs uppercase tracking-widest text-lime">{tierName}</p>}<h2 className="text-3xl">{s.name}</h2></div>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-2xl hover:border-lime">×</button>
        </div>
        <Logo s={s} className="mb-4 h-40 w-full" />
        {s.description && <p className="whitespace-pre-line text-bone/90">{s.description}</p>}
        <ul className="mt-4 space-y-2 text-sm">
          {s.website && <li><span className="text-bone/60">Website: </span><a href={s.website} {...ext} className="break-all text-lime underline underline-offset-2">{s.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></li>}
          {s.phone && <li><span className="text-bone/60">Phone: </span><a href={telHref(s.phone)} className="text-lime underline underline-offset-2">{s.phone}</a></li>}
          {s.email && <li><span className="text-bone/60">Email: </span><a href={`mailto:${s.email}`} className="break-all text-lime underline underline-offset-2">{s.email}</a></li>}
          {s.address && <li><span className="text-bone/60">Find them: </span>{s.address}</li>}
        </ul>
        {socials.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{socials.map(([k, u]) => <a key={k} href={u} {...ext} className="btn-ghost !min-h-[40px] text-sm">{SOCIAL_LABEL[k]}</a>)}</div>}
        {s.images.length > 0 && (
          <div className="mt-5"><h3 className="mb-2 text-lg">Gallery</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">{s.images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-lg border border-line bg-ink"><Image src={img.url} alt={img.caption || `${s.name} gallery image`} width={400} height={300} sizes="(max-width: 640px) 45vw, 200px" className="h-32 w-full object-contain" /></li>))}</ul></div>)}
      </div>
    </div>
  );
}

/** Sponsor cards grouped by tier (bigger for higher tiers). Opening a card shows the full details. */
export function SponsorGrid({ groups }: { groups: SponsorGroup[] }) {
  const [open, setOpen] = useState<{ s: SponsorRow; tier: string } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => { setOpen(null); trigger.current?.focus(); };
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.tier.id} aria-label={g.tier.name}>
          <h2 className="slashes mb-4 text-3xl">{g.tier.name}</h2>
          <ul className={`grid gap-4 ${GRID[g.tier.size]}`}>
            {g.sponsors.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={(e) => { trigger.current = e.currentTarget; setOpen({ s, tier: g.tier.name }); }}
                  className="card-lime flex h-full w-full flex-col gap-3 text-left transition hover:border-lime focus-visible:border-lime" aria-label={`${s.name}: view details`}>
                  <Logo s={s} className={`w-full ${LOGO_H[g.tier.size]}`} />
                  <span className={`display ${NAME[g.tier.size]}`}>{s.name}</span>
                  {s.description && g.tier.size !== 'sm' && <span className="line-clamp-3 text-sm text-bone/75">{s.description}</span>}
                  <span className="mt-auto text-sm font-semibold text-lime">View details →</span>
                </button>
              </li>))}
          </ul>
        </section>))}
      {open && <Detail s={open.s} tierName={open.tier} onClose={close} />}
    </div>
  );
}
