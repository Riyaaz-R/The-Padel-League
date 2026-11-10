'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { audit, requireStaffAction } from '@/lib/auth';

const MAX_UPLOAD = 4 * 1024 * 1024;
const back = (kind: 'ok' | 'error', msg: string, week?: number): never =>
  redirect(`/admin/lucky-draw?${kind}=${encodeURIComponent(msg)}${week ? `#week-${week}` : ''}`);

async function activeSeasonId(db: Awaited<ReturnType<typeof requireStaffAction>>['db']): Promise<string> {
  const { data } = await db.from('seasons').select('id').eq('status', 'active').order('number', { ascending: false }).limit(1).single();
  if (!data) throw new Error('No active season');
  return data.id;
}

export async function saveWinner(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const week = Number(fd.get('week'));
  const name = String(fd.get('name') ?? '').trim();
  const caption = String(fd.get('caption') ?? '').trim();
  if (!Number.isInteger(week) || week < 1 || week > 6) return back('error', 'Unknown week');
  if (!name || name.length > 80) return back('error', 'Enter the winner’s name (up to 80 characters)', week);
  if (caption.length > 200) return back('error', 'The caption is too long (200 characters at most)', week);
  if (fd.get('consent') !== 'on') return back('error', 'Confirm the winner agreed to their name and photo being shown', week);

  const seasonId = await activeSeasonId(db);
  const { data: existing } = await db.from('lucky_draw_winners').select('photo_path').eq('season_id', seasonId).eq('week', week).maybeSingle();

  let photoPath = existing?.photo_path ?? null;
  let uploadedNew: string | null = null;
  const file = fd.get('photo');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD) return back('error', 'That photo is too large. Choose a smaller one.', week);
    let webp: Buffer;
    try {
      // rotate() applies the camera orientation; re-encoding drops location and other metadata
      webp = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    } catch { return back('error', 'That file is not a photo we can read. Use a JPG, PNG or WebP.', week); }
    const path = `week-${week}-${Date.now()}.webp`;
    const up = await db.storage.from('lucky-draw').upload(path, webp, { contentType: 'image/webp', upsert: false });
    if (up.error) return back('error', `Photo upload failed: ${up.error.message}`, week);
    uploadedNew = path; photoPath = path;
  }

  const res = await db.from('lucky_draw_winners').upsert(
    { season_id: seasonId, week, winner_name: name, caption: caption || null, photo_path: photoPath, consent_confirmed: true },
    { onConflict: 'season_id,week' },
  );
  if (res.error) {
    if (uploadedNew) await db.storage.from('lucky-draw').remove([uploadedNew]);
    return back('error', res.error.message, week);
  }
  let note = '';
  if (uploadedNew && existing?.photo_path) { const rm = await db.storage.from('lucky-draw').remove([existing.photo_path]); if (rm.error || !rm.data?.length) note = ' (the old photo could not be deleted)'; }
  await audit(db, staff, 'luckydraw.winner.save', `Week ${week}: ${name}${uploadedNew ? ' (photo)' : ''}`);
  revalidatePath('/lucky-draw');
  back('ok', `Week ${week} winner saved${note}`, week);
}

export async function removeWinner(fd: FormData) {
  const { db, staff } = await requireStaffAction('committee');
  const week = Number(fd.get('week'));
  if (!Number.isInteger(week) || week < 1 || week > 6) return back('error', 'Unknown week');
  const seasonId = await activeSeasonId(db);
  const { data: existing } = await db.from('lucky_draw_winners').select('photo_path, winner_name').eq('season_id', seasonId).eq('week', week).maybeSingle();
  if (!existing) return back('error', 'There is no winner saved for that week', week);
  const del = await db.from('lucky_draw_winners').delete().eq('season_id', seasonId).eq('week', week);
  if (del.error) return back('error', del.error.message, week);
  let note = '';
  if (existing.photo_path) { const rm = await db.storage.from('lucky-draw').remove([existing.photo_path]); if (rm.error || !rm.data?.length) note = ' (the photo file could not be deleted; tell the developer)'; }
  await audit(db, staff, 'luckydraw.winner.remove', `Week ${week}: ${existing.winner_name}`);
  revalidatePath('/lucky-draw');
  back('ok', `Week ${week} winner removed${note}`, week);
}
