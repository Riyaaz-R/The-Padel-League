/** Pure helpers for the sponsor features: text and URL sanitising, banner timing. */

export const SOCIAL_KEYS = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'linkedin', 'whatsapp'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export const SOCIAL_LABEL: Record<SocialKey, string> = { instagram: 'Instagram', facebook: 'Facebook', x: 'X (Twitter)', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', whatsapp: 'WhatsApp' };

export const TIER_SIZES = ['xl', 'lg', 'md', 'sm'] as const;
export type TierSize = (typeof TIER_SIZES)[number];
export const TIER_SIZE_LABEL: Record<TierSize, string> = { xl: 'Extra large (full width)', lg: 'Large (2 across)', md: 'Medium (3 across)', sm: 'Small (4 across)' };

export type BannerSpeed = 'slow' | 'medium' | 'fast';
export const BANNER_SPEEDS: readonly BannerSpeed[] = ['slow', 'medium', 'fast'] as const;
/** Seconds each banner item takes to cross the screen: smaller is faster. */
export const SPEED_SECONDS_PER_ITEM: Record<BannerSpeed, number> = { slow: 11, medium: 7, fast: 4 };

/** Removes control characters and trims. Output is plain text: React escapes it when shown. */
export function cleanText(input: unknown, max: number, opts: { multiline?: boolean } = {}): string {
  let s = String(input ?? '');
  s = opts.multiline ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
}

export type UrlResult = { ok: true; url: string | null } | { ok: false; error: string };
/**
 * Accepts only http(s) links. Blank means "none". "example.com" becomes "https://example.com".
 * Anything else (javascript:, data:, mailto: ...) is rejected.
 */
export function cleanUrl(input: unknown, label = 'Link'): UrlResult {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, url: null };
  if (raw.length > 500) return { ok: false, error: `${label} is too long` };
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/\//, '')}`;
  let u: URL;
  try { u = new URL(candidate); } catch { return { ok: false, error: `${label} is not a valid web address` }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, error: `${label} must start with http:// or https://` };
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') return { ok: false, error: `${label} is not a valid web address` };
  if (u.username || u.password) return { ok: false, error: `${label} must not contain a user name or password` };
  return { ok: true, url: u.toString() };
}

export function cleanEmail(input: unknown): { ok: true; email: string | null } | { ok: false; error: string } {
  const s = String(input ?? '').trim();
  if (!s) return { ok: true, email: null };
  return /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(s) && s.length <= 120 ? { ok: true, email: s } : { ok: false, error: 'That email address does not look right' };
}

export function cleanPhone(input: unknown): { ok: true; phone: string | null } | { ok: false; error: string } {
  const s = cleanText(input, 40);
  if (!s) return { ok: true, phone: null };
  const digits = s.replace(/\D/g, '');
  return /^[+\d\s()\-.]+$/.test(s) && digits.length >= 6 && digits.length <= 15 ? { ok: true, phone: s } : { ok: false, error: 'That phone number does not look right' };
}
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** Is a banner item inside its optional start/end dates today? (dates are YYYY-MM-DD, inclusive) */
export function inWindow(startsOn: string | null | undefined, endsOn: string | null | undefined, today: string): boolean {
  return (!startsOn || startsOn <= today) && (!endsOn || endsOn >= today);
}

/** How many times one copy of the items must repeat so a single copy is wider than the screen (for a seamless loop). */
export function marqueeRepeats(itemCount: number, itemWidthPx = 380, minWidthPx = 2200): number {
  if (itemCount <= 0) return 0;
  return Math.max(1, Math.ceil(minWidthPx / (itemCount * itemWidthPx)));
}
/** Seconds for one full loop of one copy. */
export function marqueeSeconds(itemCount: number, speed: BannerSpeed, repeats: number): number {
  return Math.max(12, itemCount * repeats * SPEED_SECONDS_PER_ITEM[speed]);
}

/** Moves one id up (-1) or down (+1) in an ordered list and returns the new order, or null if it can't move. */
export function reorder<T extends { id: string }>(items: T[], id: string, dir: -1 | 1): T[] | null {
  const i = items.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return null;
  const out = items.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
