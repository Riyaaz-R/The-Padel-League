import { marqueeRepeats, marqueeSeconds, type BannerSpeed } from '@/domain/sponsors';
import type { BannerItemView } from '@/data/sponsors';

function Item({ it }: { it: BannerItemView }) {
  const inner = (
    <>
      {it.logoUrl && (
        <span className={`sp-logo ${it.logoBg === 'dark' ? 'sp-logo-dark' : 'sp-logo-light'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.logoUrl} alt="" loading="lazy" decoding="async" />
        </span>
      )}
      <span className="sp-msg">{it.message}</span>
      <span aria-hidden="true" className="sp-dot">✦</span>
    </>
  );
  return it.link
    ? <a href={it.link} target="_blank" rel="noopener noreferrer" className="sp-item sp-link">{inner}</a>
    : <span className="sp-item">{inner}</span>;
}

/**
 * Continuous right-to-left ticker of sponsor messages. Pure CSS animation, seamless loop (two identical copies, shifted by half).
 * Pauses on hover (desktop only) and on keyboard focus; with "reduce motion" it becomes a static, scrollable strip.
 * Used by the fixed bar on public pages, the TV screen, and the live preview in the staff area.
 */
export function SponsorMarquee({ items, speed, className = '' }: { items: BannerItemView[]; speed: BannerSpeed; className?: string }) {
  if (items.length === 0) return null;
  const repeats = marqueeRepeats(items.length);
  const seconds = marqueeSeconds(items.length, speed, repeats);
  const copy = Array.from({ length: repeats }, () => items).flat();
  return (
    <section aria-label="Sponsors" className={`sp-bar ${className}`}>
      <div className="sp-track" style={{ ['--dur' as string]: `${seconds}s` }}>
        <div className="sp-copy">{copy.map((it, i) => <Item key={`a${i}`} it={it} />)}</div>
        <div className="sp-copy" aria-hidden="true">{copy.map((it, i) => <Item key={`b${i}`} it={it} />)}</div>
      </div>
    </section>
  );
}
