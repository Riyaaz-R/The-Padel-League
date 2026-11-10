'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const FIRST_MS = 20_000; // first showing shortly after the page opens
const EVERY_MS = 60_000; // then once a minute
const SHOW_MS = 5_000; // for 5 seconds

/**
 * TPC Café Lucky Draw advert: pops up for 5 seconds every minute on public pages (phones, the TV screen, the live page).
 * It pauses while someone hovers, touches or focuses it, can be closed, and links to the Lucky Draw page.
 */
export function LuckyDrawPopup() {
  const path = usePathname();
  const disabled = path.startsWith('/admin') || path.startsWith('/staff') || path.startsWith('/lucky-draw');
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    if (disabled) { setOpen(false); return; }
    let hide: ReturnType<typeof setTimeout> | undefined, every: ReturnType<typeof setInterval> | undefined;
    const scheduleHide = () => {
      clearTimeout(hide);
      hide = setTimeout(() => { if (pausedRef.current) scheduleHide(); else setOpen(false); }, SHOW_MS);
    };
    const show = () => { if (document.visibilityState !== 'visible') return; setOpen(true); scheduleHide(); };
    const first = setTimeout(() => { show(); every = setInterval(show, EVERY_MS); }, FIRST_MS);
    return () => { clearTimeout(first); clearTimeout(hide); clearInterval(every); setOpen(false); };
  }, [disabled]);

  if (disabled || !open) return null;
  return (
    <div
      role="dialog" aria-modal="false" aria-label="TPC Café Lucky Draw"
      className="popup-in fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"
      onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      <div className="relative flex max-h-full flex-col items-center gap-3">
        <button type="button" onClick={() => setOpen(false)} aria-label="Close advert"
          className="absolute -right-1 -top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-2xl font-bold text-lime ring-2 ring-lime">×</button>
        <Link href="/lucky-draw" onClick={() => setOpen(false)} className="block overflow-hidden rounded-2xl ring-2 ring-lime" aria-label="See the TPC Café Lucky Draw">
          <Image src="/lucky-draw/poster.webp" alt="TPC Café Lucky Draw: 6 weeks, 6 prizes, 1 epic grand prize" width={1100} height={1559} sizes="(max-width: 768px) 90vw, 60vh"
            className="h-auto max-h-[78vh] w-auto max-w-[92vw] object-contain" />
        </Link>
        <Link href="/lucky-draw" onClick={() => setOpen(false)} className="btn">See the Lucky Draw</Link>
        <div className="h-1 w-48 overflow-hidden rounded bg-line" aria-hidden="true">
          <div className={`popup-bar h-full bg-lime ${paused ? 'popup-bar-paused' : ''}`} />
        </div>
      </div>
    </div>
  );
}
