import 'server-only';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Vercel functions accept about 4.5 MB per request, so uploads are capped at 4 MB. Browsers shrink big photos first. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(['png', 'jpeg', 'webp', 'svg']);

/**
 * An SVG can carry scripts or links to other files. We rasterise it (so nothing active is ever stored), but also refuse
 * obviously unsafe ones so people get a clear message instead of a surprise.
 */
export function svgLooksSafe(svg: string): boolean {
  if (/<script|<foreignObject|<!ENTITY|<!DOCTYPE[^>]*\[|\son[a-z]+\s*=|javascript:/i.test(svg)) return false;
  for (const m of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    const v = m[1].trim();
    if (!(v.startsWith('#') || /^data:image\/(png|jpeg|webp);base64,/i.test(v))) return false;
  }
  return true;
}

export type ImageResult = { ok: true; buffer: Buffer } | { ok: false; error: string };

/** Checks the file is a real PNG, JPG, WebP or SVG, then returns a WebP (transparency kept) no bigger than `maxSize` px. */
export async function toWebp(file: File, maxSize: number): Promise<ImageResult> {
  if (file.size === 0) return { ok: false, error: 'That file is empty' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'That image is larger than 4 MB. Choose a smaller one.' };
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata(); // decodes the header: the file type is judged by content, not by its name
    if (!meta.format || !ALLOWED.has(meta.format)) return { ok: false, error: 'Use a PNG, JPG, WebP or SVG image' };
    if (meta.format === 'svg' && !svgLooksSafe(input.toString('utf8'))) return { ok: false, error: 'That SVG contains scripts or links to other files. Export a plain SVG, or use a PNG.' };
    const buffer = await sharp(input, { limitInputPixels: 40_000_000, density: meta.format === 'svg' ? 300 : 72 })
      .rotate()
      .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: meta.format !== 'svg' })
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer();
    return { ok: true, buffer };
  } catch { return { ok: false, error: 'That file is not an image we can read. Use a PNG, JPG, WebP or SVG.' }; }
}

/** Converts and stores an image in the sponsor bucket. Returns the stored path. */
export async function storeSponsorImage(db: SupabaseClient, file: File, prefix: string, maxSize: number): Promise<{ path?: string; error?: string }> {
  const img = await toWebp(file, maxSize);
  if (!img.ok) return { error: img.error };
  const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const up = await db.storage.from('sponsor-images').upload(path, img.buffer, { contentType: 'image/webp', upsert: false });
  return up.error ? { error: `Upload failed: ${up.error.message}` } : { path };
}

export async function removeSponsorFiles(db: SupabaseClient, paths: (string | null | undefined)[]): Promise<boolean> {
  const list = paths.filter((p): p is string => Boolean(p));
  if (!list.length) return true;
  const r = await db.storage.from('sponsor-images').remove(list);
  return !r.error;
}
