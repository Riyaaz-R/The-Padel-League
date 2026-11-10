/**
 * Text that slides across the screen continuously. Pure CSS (see globals.css), so it works in server and client components.
 * With "reduce motion" on, it shows as static, wrapped text instead of scrolling.
 */
export function Marquee({ text, className = '' }: { text: string; className?: string }) {
  const unit = `${text}   ✦   `;
  const repeats = Math.max(2, Math.ceil(2600 / (unit.length * 9)));
  const block = unit.repeat(repeats);
  const seconds = Math.max(14, Math.round((block.length * 0.14) * 2) / 2);
  return (
    <div className={`marquee ${className}`} role="status" aria-label={`Announcement: ${text}`}>
      <div className="marquee-track" style={{ ['--dur' as string]: `${seconds}s` }} aria-hidden="true">
        <span>{block}</span>
        <span>{block}</span>
      </div>
      <span className="marquee-static">{text}</span>
    </div>
  );
}
