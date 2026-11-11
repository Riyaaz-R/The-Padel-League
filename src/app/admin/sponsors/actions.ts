'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { audit, requireStaffAction } from '@/lib/auth';
import { removeSponsorFiles, storeSponsorImage } from '@/lib/images';
import { BANNER_SPEEDS, SOCIAL_KEYS, TIER_SIZES, cleanEmail, cleanPhone, cleanText, cleanUrl, reorder, type SocialKey } from '@/domain/sponsors';

const MAX_GALLERY = 12;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const go = (path: string, kind: 'ok' | 'error', msg: string, extra = ''): never => redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}${extra}`);
const refresh = () => { revalidatePath('/', 'layout'); };
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const uuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Rewrites sort_order as 1..n following the given id order. */
async function renumber(db: SupabaseClient, table: 'sponsor_tiers' | 'sponsors' | 'banner_items', ids: string[]) {
  for (let i = 0; i < ids.length; i++) await db.from(table).update({ sort_order: i + 1 }).eq('id', ids[i]);
}
async function nextOrder(db: SupabaseClient, table: 'sponsor_tiers' | 'sponsors' | 'banner_items', filter?: { col: string; val: string | null }): Promise<number> {
  let q = db.from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1);
  if (filter) q = filter.val === null ? q.is(filter.col, null) : q.eq(filter.col, filter.val);
  const { data } = await q;
  return (data?.[0]?.sort_order ?? 0) + 1;
}

// ---------------- tiers ----------------
export async function addTier(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const name = cleanText(fd.get('name'), 40); const size = str(fd, 'size');
  if (!name) return go('/admin/sponsors', 'error', 'Enter a tier name', '#tiers');
  if (!(TIER_SIZES as readonly string[]).includes(size)) return go('/admin/sponsors', 'error', 'Choose a tier size', '#tiers');
  const r = await db.from('sponsor_tiers').insert({ name, size, sort_order: await nextOrder(db, 'sponsor_tiers') });
  if (r.error) return go('/admin/sponsors', 'error', r.error.message, '#tiers');
  await audit(db, staff, 'sponsor.tier.add', name);
  refresh(); go('/admin/sponsors', 'ok', `Added the tier “${name}”`, '#tiers');
}
export async function saveTier(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const name = cleanText(fd.get('name'), 40); const size = str(fd, 'size');
  if (!uuid(id) || !name) return go('/admin/sponsors', 'error', 'Enter a tier name', '#tiers');
  if (!(TIER_SIZES as readonly string[]).includes(size)) return go('/admin/sponsors', 'error', 'Choose a tier size', '#tiers');
  const r = await db.from('sponsor_tiers').update({ name, size }).eq('id', id);
  if (r.error) return go('/admin/sponsors', 'error', r.error.message, '#tiers');
  await audit(db, staff, 'sponsor.tier.save', `${name} (${size})`, undefined, id);
  refresh(); go('/admin/sponsors', 'ok', `Saved the tier “${name}”`, '#tiers');
}
export async function deleteTier(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id');
  const used = await db.from('sponsors').select('id', { count: 'exact', head: true }).eq('tier_id', id);
  if ((used.count ?? 0) > 0) return go('/admin/sponsors', 'error', `${used.count} sponsor(s) are in this tier. Move them to another tier first.`, '#tiers');
  const { data: t } = await db.from('sponsor_tiers').select('name').eq('id', id).maybeSingle();
  const r = await db.from('sponsor_tiers').delete().eq('id', id);
  if (r.error) return go('/admin/sponsors', 'error', r.error.message, '#tiers');
  await audit(db, staff, 'sponsor.tier.delete', t?.name ?? id, undefined, id);
  refresh(); go('/admin/sponsors', 'ok', `Deleted the tier “${t?.name ?? ''}”`, '#tiers');
}
export async function moveTier(fd: FormData) {
  const { db } = await requireStaffAction('committee');
  const { data } = await db.from('sponsor_tiers').select('id').order('sort_order').order('created_at');
  const next = reorder((data ?? []) as { id: string }[], str(fd, 'id'), str(fd, 'dir') === 'up' ? -1 : 1);
  if (next) await renumber(db, 'sponsor_tiers', next.map((x) => x.id));
  refresh(); go('/admin/sponsors', 'ok', 'Tier order saved', '#tiers');
}

// ---------------- sponsors ----------------
interface SponsorFields {
  name: string; tierId: string | null; description: string | null; website: string | null; phone: string | null; email: string | null; address: string | null;
  socials: Partial<Record<SocialKey, string>>; logoBg: 'light' | 'dark'; active: boolean;
}
function readSponsor(fd: FormData): { ok: true; v: SponsorFields } | { ok: false; error: string } {
  const name = cleanText(fd.get('name'), 80);
  if (!name) return { ok: false, error: 'Enter the sponsor’s name' };
  const tier = str(fd, 'tier_id');
  if (tier && !uuid(tier)) return { ok: false, error: 'Choose a valid tier' };
  const web = cleanUrl(fd.get('website'), 'Website'); if (!web.ok) return { ok: false, error: web.error };
  const phone = cleanPhone(fd.get('phone')); if (!phone.ok) return { ok: false, error: phone.error };
  const email = cleanEmail(fd.get('email')); if (!email.ok) return { ok: false, error: email.error };
  const socials: Partial<Record<SocialKey, string>> = {};
  for (const k of SOCIAL_KEYS) {
    const u = cleanUrl(fd.get(`social_${k}`), k[0].toUpperCase() + k.slice(1) + ' link'); if (!u.ok) return { ok: false, error: u.error };
    if (u.url) socials[k] = u.url;
  }
  return {
    ok: true, v: {
      name, tierId: tier || null, description: cleanText(fd.get('description'), 1000, { multiline: true }) || null, website: web.url, phone: phone.phone, email: email.email,
      address: cleanText(fd.get('address'), 300) || null, socials, logoBg: str(fd, 'logo_bg') === 'dark' ? 'dark' : 'light', active: fd.get('active') === 'on',
    },
  };
}
const rowOf = (v: SponsorFields) => ({ tier_id: v.tierId, name: v.name, description: v.description, website: v.website, phone: v.phone, email: v.email, address: v.address, socials: v.socials, logo_bg: v.logoBg, active: v.active, updated_at: new Date().toISOString() });

async function addGallery(db: SupabaseClient, sponsorId: string, files: File[]): Promise<string | null> {
  const { count } = await db.from('sponsor_images').select('id', { count: 'exact', head: true }).eq('sponsor_id', sponsorId);
  if ((count ?? 0) + files.length > MAX_GALLERY) return `A sponsor can have up to ${MAX_GALLERY} gallery images.`;
  let order = await (async () => { const { data } = await db.from('sponsor_images').select('sort_order').eq('sponsor_id', sponsorId).order('sort_order', { ascending: false }).limit(1); return data?.[0]?.sort_order ?? 0; })();
  for (const f of files) {
    const up = await storeSponsorImage(db, f, `gallery-${sponsorId.slice(0, 8)}`, 1600);
    if (up.error) return up.error;
    const r = await db.from('sponsor_images').insert({ sponsor_id: sponsorId, path: up.path!, sort_order: ++order });
    if (r.error) { await removeSponsorFiles(db, [up.path]); return r.error.message; }
  }
  return null;
}

export async function saveSponsor(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const creating = !id;
  const page = creating ? '/admin/sponsors/new' : `/admin/sponsors/${id}`;
  if (!creating && !uuid(id)) return go('/admin/sponsors', 'error', 'That sponsor no longer exists');
  const parsed = readSponsor(fd);
  if (!parsed.ok) return go(page, 'error', parsed.error);
  const v = parsed.v;
  if (v.tierId) { const t = await db.from('sponsor_tiers').select('id').eq('id', v.tierId).maybeSingle(); if (!t.data) return go(page, 'error', 'That tier no longer exists'); }

  const logoFile = fd.get('logo'); const hasLogo = logoFile instanceof File && logoFile.size > 0;
  const gallery = fd.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);

  let sponsorId = id; let oldLogo: string | null = null;
  if (creating) {
    const ins = await db.from('sponsors').insert({ ...rowOf(v), sort_order: await nextOrder(db, 'sponsors', { col: 'tier_id', val: v.tierId }) }).select('id').single();
    if (ins.error) return go(page, 'error', ins.error.message);
    sponsorId = ins.data.id;
  } else {
    const cur = await db.from('sponsors').select('logo_path, tier_id').eq('id', id).maybeSingle();
    if (!cur.data) return go('/admin/sponsors', 'error', 'That sponsor no longer exists');
    oldLogo = cur.data.logo_path;
    const upd = await db.from('sponsors').update({ ...rowOf(v), ...(cur.data.tier_id !== v.tierId ? { sort_order: await nextOrder(db, 'sponsors', { col: 'tier_id', val: v.tierId }) } : {}) }).eq('id', id);
    if (upd.error) return go(page, 'error', upd.error.message);
  }
  const back = `/admin/sponsors/${sponsorId}`;
  const problems: string[] = [];

  if (hasLogo) {
    const up = await storeSponsorImage(db, logoFile as File, `logo-${sponsorId.slice(0, 8)}`, 1200);
    if (up.error) problems.push(`Logo: ${up.error}`);
    else {
      const r = await db.from('sponsors').update({ logo_path: up.path }).eq('id', sponsorId);
      if (r.error) { problems.push(r.error.message); await removeSponsorFiles(db, [up.path]); } else if (oldLogo) await removeSponsorFiles(db, [oldLogo]);
    }
  } else if (!creating && fd.get('remove_logo') === 'on' && oldLogo) {
    await db.from('sponsors').update({ logo_path: null }).eq('id', sponsorId); await removeSponsorFiles(db, [oldLogo]);
  }
  if (gallery.length) { const e = await addGallery(db, sponsorId, gallery); if (e) problems.push(`Gallery: ${e}`); }

  await audit(db, staff, creating ? 'sponsor.create' : 'sponsor.save', v.name, undefined, sponsorId);
  refresh();
  if (problems.length) return go(back, 'error', `${creating ? 'Sponsor created' : 'Saved'}, but: ${problems.join(' ')}`);
  go(back, 'ok', creating ? `Added ${v.name}. It is ${v.active ? 'live on the Sponsors page' : 'switched off for now'}.` : `Saved ${v.name}`);
}

export async function removeSponsorImage(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const sponsorId = str(fd, 'sponsor_id');
  const { data: img } = await db.from('sponsor_images').select('path').eq('id', id).maybeSingle();
  if (!img) return go(`/admin/sponsors/${sponsorId}`, 'error', 'That image no longer exists');
  const r = await db.from('sponsor_images').delete().eq('id', id);
  if (r.error) return go(`/admin/sponsors/${sponsorId}`, 'error', r.error.message);
  await removeSponsorFiles(db, [img.path]);
  await audit(db, staff, 'sponsor.image.remove', img.path, undefined, sponsorId);
  refresh(); go(`/admin/sponsors/${sponsorId}`, 'ok', 'Image removed', '#gallery');
}

export async function deleteSponsor(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const page = `/admin/sponsors/${id}`;
  const { data: sp } = await db.from('sponsors').select('name, logo_path, sponsor_images(path)').eq('id', id).maybeSingle();
  if (!sp) return go('/admin/sponsors', 'error', 'That sponsor no longer exists');
  const items = await db.from('banner_items').select('id, logo_path').eq('sponsor_id', id); // these are removed together with the sponsor
  const files = [sp.logo_path, ...((sp.sponsor_images ?? []) as { path: string }[]).map((i) => i.path), ...(items.data ?? []).map((i) => i.logo_path)];
  const r = await db.from('sponsors').delete().eq('id', id); // gallery rows and banner items cascade
  if (r.error) return go(page, 'error', r.error.message);
  await removeSponsorFiles(db, files);
  const n = items.data?.length ?? 0;
  await audit(db, staff, 'sponsor.delete', `${sp.name}${n ? ` (and ${n} banner item(s))` : ''}`, undefined, id);
  refresh(); go('/admin/sponsors', 'ok', `Deleted ${sp.name}${n ? ` and ${n} banner item(s) that used it` : ''}`);
}

export async function toggleSponsor(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const active = str(fd, 'active') === 'true';
  const r = await db.from('sponsors').update({ active, updated_at: new Date().toISOString() }).eq('id', id).select('name').maybeSingle();
  if (r.error || !r.data) return go('/admin/sponsors', 'error', r.error?.message ?? 'That sponsor no longer exists');
  await audit(db, staff, 'sponsor.toggle', `${r.data.name}: ${active ? 'active' : 'off'}`, undefined, id);
  refresh(); go('/admin/sponsors', 'ok', `${r.data.name} is now ${active ? 'shown' : 'hidden'} on the Sponsors page`);
}

export async function moveSponsor(fd: FormData) {
  const { db } = await requireStaffAction('committee');
  const id = str(fd, 'id');
  const cur = await db.from('sponsors').select('tier_id').eq('id', id).maybeSingle();
  if (!cur.data) return go('/admin/sponsors', 'error', 'That sponsor no longer exists');
  let q = db.from('sponsors').select('id').order('sort_order').order('created_at');
  q = cur.data.tier_id ? q.eq('tier_id', cur.data.tier_id) : q.is('tier_id', null);
  const { data } = await q;
  const next = reorder((data ?? []) as { id: string }[], id, str(fd, 'dir') === 'up' ? -1 : 1);
  if (next) await renumber(db, 'sponsors', next.map((x) => x.id));
  refresh(); go('/admin/sponsors', 'ok', 'Sponsor order saved');
}

// ---------------- banner ----------------
export async function saveBannerSettings(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const speed = str(fd, 'speed'); const enabled = fd.get('enabled') === 'on';
  if (!(BANNER_SPEEDS as readonly string[]).includes(speed)) return go('/admin/banner', 'error', 'Choose a scroll speed');
  const r = await db.from('banner_settings').upsert({ id: 1, enabled, speed, updated_at: new Date().toISOString() });
  if (r.error) return go('/admin/banner', 'error', r.error.message);
  await audit(db, staff, 'banner.settings', `${enabled ? 'on' : 'off'}, ${speed}`);
  refresh(); go('/admin/banner', 'ok', `Banner is ${enabled ? 'ON' : 'OFF'}, speed ${speed}`);
}

export async function saveBannerItem(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const creating = !id; const page = '/admin/banner';
  const anchor = creating ? '#new-item' : `#item-${id}`;
  const message = cleanText(fd.get('message'), 160);
  if (!message) return go(page, 'error', 'Enter the banner message', anchor);
  const link = cleanUrl(fd.get('link_url'), 'Link'); if (!link.ok) return go(page, 'error', link.error, anchor);
  const sponsorId = str(fd, 'sponsor_id');
  if (sponsorId) { if (!uuid(sponsorId)) return go(page, 'error', 'Choose a valid sponsor', anchor); const s = await db.from('sponsors').select('id').eq('id', sponsorId).maybeSingle(); if (!s.data) return go(page, 'error', 'That sponsor no longer exists', anchor); }
  const startsOn = str(fd, 'starts_on'); const endsOn = str(fd, 'ends_on');
  if ((startsOn && !isDate(startsOn)) || (endsOn && !isDate(endsOn))) return go(page, 'error', 'Enter valid start and end dates', anchor);
  if (startsOn && endsOn && endsOn < startsOn) return go(page, 'error', 'The end date must be on or after the start date', anchor);

  const row = { message, sponsor_id: sponsorId || null, link_url: link.url, active: fd.get('active') === 'on', starts_on: startsOn || null, ends_on: endsOn || null };
  const logoFile = fd.get('logo'); const hasLogo = logoFile instanceof File && logoFile.size > 0;
  let upload: string | null = null;
  if (hasLogo) { const up = await storeSponsorImage(db, logoFile as File, 'banner', 600); if (up.error) return go(page, 'error', `Logo: ${up.error}`, anchor); upload = up.path!; }

  if (creating) {
    const r = await db.from('banner_items').insert({ ...row, logo_path: upload, sort_order: await nextOrder(db, 'banner_items') }).select('id').single();
    if (r.error) { await removeSponsorFiles(db, [upload]); return go(page, 'error', r.error.message, anchor); }
    await audit(db, staff, 'banner.item.add', message, undefined, r.data.id);
    refresh(); return go(page, 'ok', 'Banner item added');
  }
  const { data: cur } = await db.from('banner_items').select('logo_path').eq('id', id).maybeSingle();
  if (!cur) { await removeSponsorFiles(db, [upload]); return go(page, 'error', 'That banner item no longer exists'); }
  const removeOwn = !upload && fd.get('remove_logo') === 'on';
  const r = await db.from('banner_items').update({ ...row, ...(upload ? { logo_path: upload } : removeOwn ? { logo_path: null } : {}) }).eq('id', id);
  if (r.error) { await removeSponsorFiles(db, [upload]); return go(page, 'error', r.error.message, anchor); }
  if ((upload || removeOwn) && cur.logo_path) await removeSponsorFiles(db, [cur.logo_path]);
  await audit(db, staff, 'banner.item.save', message, undefined, id);
  refresh(); go(page, 'ok', 'Banner item saved', anchor);
}

export async function deleteBannerItem(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id');
  const { data: it } = await db.from('banner_items').select('message, logo_path').eq('id', id).maybeSingle();
  if (!it) return go('/admin/banner', 'error', 'That banner item no longer exists');
  const r = await db.from('banner_items').delete().eq('id', id);
  if (r.error) return go('/admin/banner', 'error', r.error.message);
  await removeSponsorFiles(db, [it.logo_path]);
  await audit(db, staff, 'banner.item.delete', it.message, undefined, id);
  refresh(); go('/admin/banner', 'ok', 'Banner item deleted');
}

export async function toggleBannerItem(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const active = str(fd, 'active') === 'true';
  const r = await db.from('banner_items').update({ active }).eq('id', id).select('message').maybeSingle();
  if (r.error || !r.data) return go('/admin/banner', 'error', r.error?.message ?? 'That banner item no longer exists');
  await audit(db, staff, 'banner.item.toggle', `${r.data.message}: ${active ? 'on' : 'off'}`, undefined, id);
  refresh(); go('/admin/banner', 'ok', active ? 'Item switched on' : 'Item switched off (removed from the public site)', `#item-${id}`);
}

export async function moveBannerItem(fd: FormData) {
  const { db } = await requireStaffAction('committee');
  const { data } = await db.from('banner_items').select('id').order('sort_order').order('created_at');
  const id = str(fd, 'id');
  const next = reorder((data ?? []) as { id: string }[], id, str(fd, 'dir') === 'up' ? -1 : 1);
  if (next) await renumber(db, 'banner_items', next.map((x) => x.id));
  refresh(); go('/admin/banner', 'ok', 'Banner order saved', `#item-${id}`);
}
