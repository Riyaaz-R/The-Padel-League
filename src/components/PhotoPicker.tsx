'use client';
import { useRef, useState } from 'react';

/** Grey checkerboard so a transparent logo is clearly seen as transparent. */
export const CHECKER = { backgroundImage: 'repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%)', backgroundSize: '16px 16px' } as const;
const SVG_MAX = 4 * 1024 * 1024;

/**
 * Photo/logo field that shrinks a phone photo in the browser (default max 1400px JPEG; PNG with transparency for logos) before upload,
 * so it is small and quick even on venue Wi-Fi. EXIF orientation is applied. The server re-processes it to WebP and strips metadata.
 * SVG files are passed through untouched (the server rasterises them) and previewed as they are.
 */
export function PhotoPicker({ name = 'photo', label = 'Winner photo (optional)', maxSize = 1400, keepTransparency = false, checker = false, onPreview }: { name?: string; label?: string; maxSize?: number; keepTransparency?: boolean; checker?: boolean; onPreview?: (url: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const show = (u: string | null) => { setPreview(u); onPreview?.(u); };

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr(''); show(null);
    if (!f) return;
    const isSvg = f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);
    if (!f.type.startsWith('image/') && !isSvg) { setErr('Please choose an image (PNG, JPG, WebP or SVG).'); e.target.value = ''; return; }
    if (isSvg) {
      if (f.size > SVG_MAX) { setErr('That SVG is larger than 4 MB. Choose a smaller one.'); e.target.value = ''; return; }
      show(URL.createObjectURL(f)); return;
    }
    setBusy(true);
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
      const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      const mime = keepTransparency ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, mime, 0.86));
      if (!blob) throw new Error('encode');
      if (blob.size > SVG_MAX) { setErr('That image is still larger than 4 MB after shrinking. Choose a smaller one.'); if (input.current) input.current.value = ''; return; }
      const dt = new DataTransfer();
      dt.items.add(new File([blob], keepTransparency ? 'upload.png' : 'upload.jpg', { type: mime }));
      if (input.current) input.current.files = dt.files;
      show(URL.createObjectURL(blob));
    } catch { setErr('Could not read that image. Try a different one.'); if (input.current) input.current.value = ''; }
    finally { setBusy(false); }
  }

  return (
    <div className="text-sm">
      <label className="block">{label}
        <input ref={input} type="file" name={name} accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" onChange={onChange} className="input mt-1 !py-2" />
      </label>
      <p className="mt-1 text-xs text-bone/60">PNG, JPG, WebP or SVG, up to 4 MB.</p>
      {busy && <p className="mt-1 text-bone/70">Preparing image…</p>}
      {err && <p role="alert" className="mt-1 text-red-300">{err}</p>}
      {preview && (
        <div className="mt-2">
          <p className="text-xs text-bone/60">Preview{checker ? ' (the checkerboard shows transparent areas)' : ''}:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview of the chosen image" className="mt-1 h-32 w-32 rounded-xl border border-line object-contain" style={checker ? CHECKER : undefined} />
        </div>)}
    </div>
  );
}
