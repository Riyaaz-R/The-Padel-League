'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { audit, requireStaffAction, type Staff } from '@/lib/auth';
import { loadStateFresh } from '@/data/db';
import { findDuplicates, fullName, validatePlayerInput } from '@/domain/names';

type Ctx = { db: SupabaseClient; staff: Staff };
const MAX_UPLOAD = 4 * 1024 * 1024;
const STATUSES = ['registered', 'approved', 'in_auction', 'sold', 'unsold', 'withdrawn', 'replaced'];
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const go = (path: string, kind: 'ok' | 'error', msg: string, extra = ''): never => redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}${extra}`);
const refresh = () => { revalidatePath('/', 'layout'); };

/** Re-encode an uploaded image as WebP (drops location/camera metadata) and store it. Returns the stored path. */
async function uploadImage(db: SupabaseClient, bucket: 'player-photos' | 'team-logos', file: File, prefix: string, size: number): Promise<{ path?: string; error?: string }> {
  if (file.size > MAX_UPLOAD) return { error: 'That image is too large. Choose a smaller one.' };
  let webp: Buffer;
  try { webp = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(); }
  catch { return { error: 'That file is not an image we can read. Use a JPG, PNG or WebP.' }; }
  const path = `${prefix}-${Date.now()}.webp`;
  const up = await db.storage.from(bucket).upload(path, webp, { contentType: 'image/webp', upsert: false });
  return up.error ? { error: `Upload failed: ${up.error.message}` } : { path };
}
const removeFile = async (db: SupabaseClient, bucket: 'player-photos' | 'team-logos', path?: string | null) => { if (path && !path.startsWith('/')) await db.storage.from(bucket).remove([path]); };

/**
 * Takes a player out of scheduled and live pairings (completed fixtures keep their history).
 * Needed when a player changes team or level so no open fixture is left with someone who no longer fits.
 */
async function clearFromOpenFixtures(db: SupabaseClient, seasonId: string, playerId: string): Promise<number> {
  const { data: open } = await db.from('fixtures').select('id').eq('season_id', seasonId).neq('status', 'final');
  const ids = (open ?? []).map((f) => f.id);
  if (!ids.length) return 0;
  let n = 0;
  for (const col of ['home_p1', 'home_p2', 'away_p1', 'away_p2']) {
    const r = await db.from('pairings').update({ [col]: null }).eq(col, playerId).in('fixture_id', ids).select('id');
    n += r.data?.length ?? 0;
  }
  return n;
}

async function usedInPairings(db: SupabaseClient, playerId: string): Promise<number> {
  const r = await db.from('pairings').select('id', { count: 'exact', head: true }).or(`home_p1.eq.${playerId},home_p2.eq.${playerId},away_p1.eq.${playerId},away_p2.eq.${playerId}`);
  return r.count ?? 0;
}

async function allNames(db: SupabaseClient, seasonId: string) {
  const { data } = await db.from('season_players').select('id, persons(first_name, second_name, corrected_name)').eq('season_id', seasonId);
  return (data ?? []).map((r) => { const p = (Array.isArray(r.persons) ? r.persons[0] : r.persons) as { first_name: string; second_name: string | null; corrected_name: string | null }; return { id: r.id as string, name: fullName(p.first_name, p.second_name, p.corrected_name) }; });
}

interface PlayerFields {
  first: string; surname: string; corrected: string; division: string; teamSlug: string; status: string;
  price: number | null; suspendedUntil: string | null; injured: boolean; isMinor: boolean; guardian: boolean; photoConsent: boolean;
  phone: string; email: string; emergency: string;
}
function readPlayer(fd: FormData): PlayerFields {
  const price = str(fd, 'price');
  const susp = str(fd, 'suspended_until');
  return {
    first: str(fd, 'first_name'), surname: str(fd, 'surname'), corrected: str(fd, 'corrected_name'), division: str(fd, 'division'), teamSlug: str(fd, 'team'), status: str(fd, 'status') || 'approved',
    price: price === '' ? null : Number(price), suspendedUntil: /^\d{4}-\d{2}-\d{2}$/.test(susp) ? susp : null,
    injured: fd.get('injured') === 'on', isMinor: fd.get('is_minor') === 'on', guardian: fd.get('guardian_consent') === 'on', photoConsent: fd.get('photo_consent') === 'on',
    phone: str(fd, 'phone'), email: str(fd, 'email'), emergency: str(fd, 'emergency_contact'),
  };
}
function problems(p: PlayerFields): string[] {
  const e = validatePlayerInput({ firstName: p.first, surname: p.surname, division: p.division });
  if (!STATUSES.includes(p.status)) e.push('Unknown player status');
  if (p.price !== null && (!Number.isFinite(p.price) || p.price < 0)) e.push('Price must be a positive number');
  if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) e.push('That email address does not look right');
  if (p.corrected.length > 120) e.push('Corrected name is too long');
  return e;
}
const personRow = (p: PlayerFields) => ({
  first_name: p.first, second_name: p.surname || null, corrected_name: p.corrected || null, name_incomplete: !p.surname && !p.corrected,
  is_minor: p.isMinor, guardian_consent: p.guardian, photo_consent: p.photoConsent, phone: p.phone || null, email: p.email || null, emergency_contact: p.emergency || null,
});

export async function savePlayer(fd: FormData) {
  const ctx: Ctx = await requireStaffAction('committee');
  const { db, staff } = ctx;
  const id = str(fd, 'id'); const page = `/admin/people/${id}`;
  const f = readPlayer(fd);
  const errs = problems(f);
  if (errs.length) return go(page, 'error', errs.join('. '));

  const s = await loadStateFresh();
  const teamUuid = f.teamSlug ? s.teamUuid[f.teamSlug] : null;
  if (f.teamSlug && !teamUuid) return go(page, 'error', 'That team does not exist');

  const { data: sp } = await db.from('season_players').select('id, person_id, team_id, division, persons(photo_path)').eq('id', id).maybeSingle();
  if (!sp) return go('/admin/people', 'error', 'That player no longer exists');

  const candidate = fullName(f.first, f.surname, f.corrected);
  const dups = findDuplicates(candidate, await allNames(db, s.seasonId), id);
  if (dups.length && fd.get('force') !== 'on') return go(page, 'error', `Another player is already called “${dups[0].name}”. Tick “Go ahead anyway” if this is a different person.`, '&dup=1');

  // photo
  const oldPhoto = ((Array.isArray(sp.persons) ? sp.persons[0] : sp.persons) as { photo_path: string | null } | null)?.photo_path ?? null;
  let photoPath = oldPhoto; let uploaded: string | null = null;
  const file = fd.get('photo');
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(db, 'player-photos', file, sp.person_id, 1000);
    if (up.error) return go(page, 'error', up.error);
    uploaded = up.path!; photoPath = uploaded;
  } else if (fd.get('remove_photo') === 'on') photoPath = null;

  const pr = await db.from('persons').update({ ...personRow(f), photo_path: photoPath }).eq('id', sp.person_id);
  if (pr.error) { if (uploaded) await removeFile(db, 'player-photos', uploaded); return go(page, 'error', pr.error.message); }
  const spr = await db.from('season_players').update({ division: f.division, team_id: teamUuid, status: f.status, price: f.price, suspended_until: f.suspendedUntil, injured: f.injured }).eq('id', id);
  if (spr.error) return go(page, 'error', spr.error.message);
  if (oldPhoto && oldPhoto !== photoPath) await removeFile(db, 'player-photos', oldPhoto);

  // team or level changed: take them out of scheduled/live pairings so no open fixture is left inconsistent
  let cleared = 0;
  if (sp.team_id !== teamUuid || sp.division !== f.division) cleared = await clearFromOpenFixtures(db, s.seasonId, id);
  await audit(db, staff, 'player.save', `${candidate} (${f.division}, ${f.teamSlug || 'no team'})${cleared ? `, removed from ${cleared} open pairing(s)` : ''}`, undefined, id);
  refresh();
  go(page, 'ok', `Saved ${candidate}${cleared ? `. They were taken out of ${cleared} scheduled/live pairing(s) because their team or level changed; completed fixtures keep their history.` : ''}`);
}

export async function createPlayer(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const page = '/admin/people/new';
  const f = readPlayer(fd);
  const errs = problems(f);
  if (errs.length) return go(page, 'error', errs.join('. '));
  const s = await loadStateFresh();
  const teamUuid = f.teamSlug ? s.teamUuid[f.teamSlug] : null;
  if (f.teamSlug && !teamUuid) return go(page, 'error', 'That team does not exist');
  const candidate = fullName(f.first, f.surname, f.corrected);
  const dups = findDuplicates(candidate, await allNames(db, s.seasonId));
  if (dups.length && fd.get('force') !== 'on') return go(page, 'error', `A player called “${dups[0].name}” already exists. Tick “Go ahead anyway” if this is a different person.`, '&dup=1');

  const person = await db.from('persons').insert(personRow(f)).select('id').single();
  if (person.error) return go(page, 'error', person.error.message);
  let photoPath: string | null = null;
  const file = fd.get('photo');
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(db, 'player-photos', file, person.data.id, 1000);
    if (up.error) { await db.from('persons').delete().eq('id', person.data.id); return go(page, 'error', up.error); }
    photoPath = up.path!;
    await db.from('persons').update({ photo_path: photoPath }).eq('id', person.data.id);
  }
  const sp = await db.from('season_players').insert({ season_id: s.seasonId, person_id: person.data.id, team_id: teamUuid, division: f.division, status: f.status, price: f.price, suspended_until: f.suspendedUntil, injured: f.injured }).select('id').single();
  if (sp.error) { await db.from('persons').delete().eq('id', person.data.id); await removeFile(db, 'player-photos', photoPath); return go(page, 'error', sp.error.message); }
  await audit(db, staff, 'player.create', `${candidate} (${f.division}, ${f.teamSlug || 'no team'})`, undefined, sp.data.id);
  refresh();
  go(`/admin/people/${sp.data.id}`, 'ok', `Added ${candidate}`);
}

export async function deletePlayer(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const page = `/admin/people/${id}`;
  const { data: sp } = await db.from('season_players').select('id, person_id, persons(first_name, second_name, corrected_name, photo_path)').eq('id', id).maybeSingle();
  if (!sp) return go('/admin/people', 'error', 'That player no longer exists');
  const p = (Array.isArray(sp.persons) ? sp.persons[0] : sp.persons) as { first_name: string; second_name: string | null; corrected_name: string | null; photo_path: string | null };
  const name = fullName(p.first_name, p.second_name, p.corrected_name);
  const used = await usedInPairings(db, id);
  if (used > 0) return go(page, 'error', `${name} appears in ${used} fixture pairing(s), so they cannot be deleted without breaking results. Set their status to “withdrawn” instead.`);
  const del = await db.from('season_players').delete().eq('id', id);
  if (del.error) return go(page, 'error', del.error.message);
  const per = await db.from('persons').delete().eq('id', sp.person_id); // may be refused if the person is a team owner/captain: harmless
  if (!per.error) await removeFile(db, 'player-photos', p.photo_path);
  await audit(db, staff, 'player.delete', name, undefined, id);
  refresh();
  go('/admin/people', 'ok', `Deleted ${name}`);
}

// ---------------- teams ----------------
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function saveTeam(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const id = str(fd, 'id'); const page = `/admin/people/teams?team=${id}`;
  const name = str(fd, 'name'); const short = str(fd, 'short').toUpperCase(); const colour = str(fd, 'colour'); const group = str(fd, 'group');
  if (!name || name.length > 60) return go(page, 'error', 'Enter a team name (up to 60 characters)', `#team-${id}`);
  if (!/^[A-Z0-9]{2,4}$/.test(short)) return go(page, 'error', 'The short name must be 2 to 4 letters or numbers (for example TIT)', `#team-${id}`);
  if (fd.get('no_colour') !== 'on' && colour && !/^#[0-9a-fA-F]{6}$/.test(colour)) return go(page, 'error', 'Pick a valid colour', `#team-${id}`);
  if (group && group !== 'A' && group !== 'B') return go(page, 'error', 'Group must be A or B', `#team-${id}`);

  const s = await loadStateFresh();
  const t = s.teams.find((x) => x.uuid === id);
  if (!t) return go('/admin/people/teams', 'error', 'That team no longer exists');
  if (s.teams.some((x) => x.uuid !== id && x.name.toLowerCase() === name.toLowerCase())) return go(page, 'error', `There is already a team called “${name}”`, `#team-${id}`);
  const newGroup = group === 'A' || group === 'B' ? group : undefined;
  if (newGroup !== t.group && s.fixtures.some((f) => f.round === 'group' && (f.home === t.id || f.away === t.id)))
    return go(page, 'error', 'This team already has group-stage fixtures, so its group cannot be changed.', `#team-${id}`);

  const { data: cur } = await db.from('teams').select('logo_path').eq('id', id).single();
  let logoPath: string | null = cur?.logo_path ?? null; let uploaded: string | null = null;
  const file = fd.get('logo');
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(db, 'team-logos', file, t.id, 512);
    if (up.error) return go(page, 'error', up.error, `#team-${id}`);
    uploaded = up.path!; logoPath = uploaded;
  } else if (fd.get('remove_logo') === 'on') logoPath = null;

  const res = await db.from('teams').update({ name, short, colour: fd.get('no_colour') === 'on' || !colour ? null : colour, group_id: newGroup ? s.groupUuid[newGroup] : null, logo_path: logoPath }).eq('id', id);
  if (res.error) { await removeFile(db, 'team-logos', uploaded); return go(page, 'error', res.error.message, `#team-${id}`); }
  if (cur?.logo_path && cur.logo_path !== logoPath) await removeFile(db, 'team-logos', cur.logo_path);
  await audit(db, staff, 'team.save', `${t.name} -> ${name} (${short}, group ${newGroup ?? 'none'})`, undefined, id);
  refresh();
  go(page, 'ok', `Saved ${name}`, `#team-${id}`);
}

export async function createTeam(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const page = '/admin/people/teams';
  const name = str(fd, 'name'); const short = str(fd, 'short').toUpperCase(); const group = str(fd, 'group');
  if (!name || name.length > 60) return go(page, 'error', 'Enter a team name (up to 60 characters)');
  if (!/^[A-Z0-9]{2,4}$/.test(short)) return go(page, 'error', 'The short name must be 2 to 4 letters or numbers');
  const s = await loadStateFresh();
  if (s.teams.some((x) => x.name.toLowerCase() === name.toLowerCase())) return go(page, 'error', `There is already a team called “${name}”`);
  let slug = slugify(name) || 'team'; let n = 2;
  while (s.teams.some((x) => x.id === slug)) slug = `${slugify(name)}-${n++}`;
  const g = group === 'A' || group === 'B' ? s.groupUuid[group] : null;
  const res = await db.from('teams').insert({ season_id: s.seasonId, slug, name, short, group_id: g });
  if (res.error) return go(page, 'error', res.error.message);
  await audit(db, staff, 'team.create', `${name} (${short}, group ${group || 'none'})`);
  refresh();
  go(page, 'ok', `Added ${name}`);
}
