'use client';
import { useRef, useState } from 'react';
import { CHECKER } from './PhotoPicker';

const LIMIT = 4 * 1024 * 1024;

/** Several images at once (sponsor gallery). Each is shrunk in the browser (SVG passes through) with a preview before saving. */
export function MultiImagePicker({ name = 'images', label = 'Add gallery images (optional)', maxSize = 1600, max = 8 }: { name?: string; label?: string; maxSize?: number; max?: number }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    setErr(''); setPreviews([]);
    if (!files.length) return;
    if (files.length > max) { setErr(`Choose up to ${max} images at a time.`); e.target.value = ''; return; }
    setBusy(true);
    try {
      const dt = new DataTransfer(); const urls: string[] = [];
      for (const f of files) {
        const isSvg = f.type === 'image/svg+xml' || /\.svg$/i.test(f.name);
        if (!f.type.startsWith('image/') && !isSvg) throw new Error(`${f.name} is not an image`);
        if (isSvg) { if (f.size > LIMIT) throw new Error(`${f.name} is larger than 4 MB`); dt.items.add(f); urls.push(URL.createObjectURL(f)); continue; }
        const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
        const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
        const mime = f.type === 'image/png' ? 'image/png' : 'image/jpeg'; // PNG stays PNG so transparency is kept
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res, mime, 0.86));
        if (!blob || blob.size > LIMIT) throw new Error(`${f.name} is larger than 4 MB after shrinking`);
        dt.items.add(new File([blob], `gallery.${mime === 'image/png' ? 'png' : 'jpg'}`, { type: mime })); urls.push(URL.createObjectURL(blob));
      }
      // the whole form is sent in one request, so keep the total under the ~4.5 MB request limit
      if ([...dt.files].reduce((n, f) => n + f.size, 0) > 4.2 * 1024 * 1024) throw new Error('These images are too large together. Add fewer at a time.');
      if (input.current) input.current.files = dt.files;
      setPreviews(urls);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not read those images.'); if (input.current) input.current.value = ''; }
    finally { setBusy(false); }
  }

  return (
    <div className="text-sm">
      <label className="block">{label}
        <input ref={input} type="file" name={name} multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" onChange={onChange} className="input mt-1 !py-2" />
      </label>
      <p className="mt-1 text-xs text-bone/60">PNG, JPG, WebP or SVG. Up to {max} at a time, about 4 MB in total.</p>
      {busy && <p className="mt-1 text-bone/70">Preparing images…</p>}
      {err && <p role="alert" className="mt-1 text-red-300">{err}</p>}
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt={`Preview ${i + 1}`} className="h-20 w-20 rounded-lg border border-line object-contain" style={CHECKER} />))}
        </div>)}
    </div>
  );
}
