import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient } from './db';
import { SOCIAL_KEYS, type BannerSpeed, type SocialKey, type TierSize } from '@/domain/sponsors';
import { storageUrl } from '@/lib/media';

export interface Tier { id: string; name: string; size: TierSize; sortOrder: number }
export interface SponsorImage { id: string; path: string; url: string; caption: string }
export interface SponsorRow {
  id: string; tierId: string | null; name: string; description: string; logoPath: string | null; logoUrl?: string; logoBg: 'light' | 'dark';
  website: string; phone: string; email: string; address: string; socials: Partial<Record<SocialKey, string>>; active: boolean; sortOrder: number; images: SponsorImage[];
}
/** What the public banner needs for one item. */
export interface BannerItemView { id: string; message: string; logoUrl?: string; logoBg: 'light' | 'dark'; link?: string }
export interface BannerView { enabled: boolean; speed: BannerSpeed; items: BannerItemView[] }
export interface BannerItemRow {
  id: string; sponsorId: string | null; message: string; logoPath: string | null; linkUrl: string; active: boolean; startsOn: string; endsOn: string; sortOrder: number;
}

const url = (path: string | null | undefined) => (path ? storageUrl('sponsor-images', path) : undefined);

export async function loadTiers(db: SupabaseClient = anonClient()): Promise<Tier[]> {
  const { data, error } = await db.from('sponsor_tiers').select('id, name, size, sort_order').order('sort_order').order('created_at');
  if (error) return [];
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, size: t.size as TierSize, sortOrder: t.sort_order }));
}

/** Public callers get active sponsors only (row-level security); staff callers get every sponsor. */
export async function loadSponsors(db: SupabaseClient = anonClient()): Promise<SponsorRow[]> {
  const { data, error } = await db.from('sponsors').select('*, sponsor_images(id, path, caption, sort_order)').order('sort_order').order('created_at');
  if (error) return [];
  return (data ?? []).map((s) => {
    const socials: Partial<Record<SocialKey, string>> = {};
    for (const k of SOCIAL_KEYS) { const v = (s.socials as Record<string, string> | null)?.[k]; if (v) socials[k] = v; }
    const imgs = ((s.sponsor_images ?? []) as { id: string; path: string; caption: string | null; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: s.id, tierId: s.tier_id, name: s.name, description: s.description ?? '', logoPath: s.logo_path, logoUrl: url(s.logo_path), logoBg: s.logo_bg === 'dark' ? 'dark' : 'light',
      website: s.website ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', socials, active: s.active, sortOrder: s.sort_order,
      images: imgs.map((i) => ({ id: i.id, path: i.path, url: storageUrl('sponsor-images', i.path), caption: i.caption ?? '' })),
    };
  });
}

/** The banner as the public sees it. Row-level security already limits items to active ones inside their date window. */
export async function loadBanner(db: SupabaseClient = anonClient()): Promise<BannerView> {
  try {
    const [settings, items] = await Promise.all([
      db.from('banner_settings').select('enabled, speed').eq('id', 1).maybeSingle(),
      db.from('banner_items').select('id, message, logo_path, link_url, sort_order, sponsors(name, logo_path, logo_bg, active)').order('sort_order').order('created_at'),
    ]);
    const enabled = settings.data?.enabled ?? false;
    const speed = (['slow', 'medium', 'fast'].includes(settings.data?.speed) ? settings.data?.speed : 'medium') as BannerSpeed;
    if (!enabled || items.error) return { enabled, speed, items: [] };
    const views = (items.data ?? []).map((i) => {
      const sp = (Array.isArray(i.sponsors) ? i.sponsors[0] : i.sponsors) as { logo_path: string | null; logo_bg: string; active: boolean } | null;
      return { id: i.id, message: i.message, logoUrl: url(i.logo_path ?? sp?.logo_path), logoBg: (sp?.logo_bg === 'dark' ? 'dark' : 'light') as 'light' | 'dark', link: i.link_url ?? undefined };
    });
    return { enabled, speed, items: views };
  } catch { return { enabled: false, speed: 'medium', items: [] }; }
}

/** Staff view of the banner: every item including inactive and out-of-window ones. */
export async function loadBannerAdmin(db: SupabaseClient): Promise<{ enabled: boolean; speed: BannerSpeed; items: BannerItemRow[] }> {
  const [settings, items] = await Promise.all([
    db.from('banner_settings').select('enabled, speed').eq('id', 1).maybeSingle(),
    db.from('banner_items').select('id, sponsor_id, message, logo_path, link_url, active, starts_on, ends_on, sort_order').order('sort_order').order('created_at'),
  ]);
  return {
    enabled: settings.data?.enabled ?? true, speed: (settings.data?.speed ?? 'medium') as BannerSpeed,
    items: (items.data ?? []).map((i) => ({ id: i.id, sponsorId: i.sponsor_id, message: i.message, logoPath: i.logo_path, linkUrl: i.link_url ?? '', active: i.active, startsOn: i.starts_on ?? '', endsOn: i.ends_on ?? '', sortOrder: i.sort_order })),
  };
}
