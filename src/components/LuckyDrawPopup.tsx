'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'tpc-lucky-draw-welcome-seen';
const TV_FIRST_MS = 15_000; // TV screen: first showing shortly after it opens
const TV_EVERY_MS = 60_000; // then once a minute
const TV_SHOW_MS = 5_000; // for 5 seconds

/**
 * TPC Café Lucky Draw advert.
 *  - Website (phones, laptops): shown ONCE when someone arrives, with a button to read the rules before carrying on. Not shown again that visit.
 *  - TV screen (/tv): pops up for 5 seconds every minute, with no buttons.
 *  - Never shown in the staff area or on the Lucky Draw page itself.
 */
export function LuckyDrawPopup() {
  const path = usePathname();
  if (path.startsWith('/tv')) return <TvAdvert />;
  if (path.startsWith('/admin') || path.startsWith('/staff')) return null;
  return <WelcomeAdvert onLuckyDrawPage={path.startsWith('/lucky-draw')} />;
}

function WelcomeAdvert({ onLuckyDrawPage }: { onLuckyDrawPage: boolean }) {
  const [open, setOpen] = useState(false);
  const handled = useRef(false); // once per page load even if browser storage is unavailable
  const primary = useRef<HTMLAnchorElement>(null);
  const secondary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage blocked: fall back to once per load */ }
    // someone who lands straight on the Lucky Draw page has already seen the details
    const mark = () => { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } };
    if (onLuckyDrawPage) { mark(); return; }
    if (seen) return;
    const t = setTimeout(() => { setOpen(true); mark(); }, 600);
    return () => clearTimeout(t);
  }, [onLuckyDrawPage]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const first = primary.current, last = secondary.current;
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="TPC Café Lucky Draw" className="popup-in fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
      <div className="flex max-h-full w-full max-w-md flex-col items-center gap-3">
        <Image src="/lucky-draw/poster.webp" alt="TPC Café Lucky Draw: 6 weeks, 6 prizes, 1 epic grand prize" width={1100} height={1559} sizes="(max-width: 768px) 90vw, 28rem" priority
          className="h-auto max-h-[62vh] w-auto max-w-full rounded-2xl object-contain ring-2 ring-lime" />
        <p className="text-center text-sm text-bone/80">Spend R100 or more at TPC Padel Café during the league to enter.</p>
        <Link href="/lucky-draw" onClick={() => setOpen(false)} className="btn w-full" ref={primary}>See the Lucky Draw rules</Link>
        <button type="button" ref={secondary} onClick={() => setOpen(false)} className="btn-ghost w-full">Continue to the website</button>
      </div>
    </div>
  );
}

/** TV screen: 5 seconds every minute, no buttons (nobody is clicking on a TV). */
function TvAdvert() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined, every: ReturnType<typeof setInterval> | undefined;
    const show = () => { if (document.visibilityState !== 'visible') return; setOpen(true); clearTimeout(hide); hide = setTimeout(() => setOpen(false), TV_SHOW_MS); };
    const first = setTimeout(() => { show(); every = setInterval(show, TV_EVERY_MS); }, TV_FIRST_MS);
    return () => { clearTimeout(first); clearTimeout(hide); clearInterval(every); };
  }, []);
  if (!open) return null;
  return (
    <div role="img" aria-label="TPC Café Lucky Draw advert" className="popup-in pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-[3vh]">
      <div className="flex max-h-full flex-col items-center gap-[1.5vh]">
        <Image src="/lucky-draw/poster.webp" alt="" width={1100} height={1559} sizes="60vh" className="h-auto max-h-[90vh] w-auto rounded-[2vh] object-contain ring-2 ring-lime" />
        <div className="h-[0.6vh] w-[30vh] overflow-hidden rounded bg-line" aria-hidden="true"><div className="popup-bar h-full bg-lime" /></div>
      </div>
    </div>
  );
}
