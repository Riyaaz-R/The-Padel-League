'use client';
import { useEffect, useState } from 'react';
import { Marquee } from './Marquee';

/** The published announcement, sliding across the top of every public page. Re-checks every 20s so edits appear without a reload. */
export function AnnouncementBar({ initial }: { initial?: string }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/banner', { cache: 'no-store' });
        if (r.ok) { const j = (await r.json()) as { text?: string | null }; if (alive) setText(j.text ?? undefined); }
      } catch { /* keep showing the last text */ }
    };
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!text) return null;
  return <Marquee text={text} className="no-print bg-lime py-2 text-base font-bold uppercase tracking-wide text-ink" />;
}
