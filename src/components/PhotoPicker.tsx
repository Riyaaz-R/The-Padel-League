'use client';
import { useRef, useState } from 'react';

/**
 * Photo field that shrinks a phone photo in the browser (max 1400px, JPEG) before upload, so it is small and quick
 * even on venue Wi-Fi. EXIF orientation is applied. The server re-processes it to WebP and strips metadata.
 */
export function PhotoPicker({ name = 'photo', label = 'Winner photo (optional)' }: { name?: string; label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setErr(''); setPreview(null);
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr('Please choose a photo (JPG, PNG or WebP).'); e.target.value = ''; return; }
    setBusy(true);
    try {
      const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
      const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.86));
      if (!blob) throw new Error('encode');
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'winner.jpg', { type: 'image/jpeg' }));
      if (input.current) input.current.files = dt.files;
      setPreview(URL.createObjectURL(blob));
    } catch { setErr('Could not read that photo. Try a different one.'); if (input.current) input.current.value = ''; }
    finally { setBusy(false); }
  }

  return (
    <div className="text-sm">
      <label className="block">{label}
        <input ref={input} type="file" name={name} accept="image/*" onChange={onChange} className="input mt-1 !py-2" />
      </label>
      {busy && <p className="mt-1 text-bone/70">Preparing photo…</p>}
      {err && <p role="alert" className="mt-1 text-red-300">{err}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt="Preview of the chosen photo" className="mt-2 h-32 w-32 rounded-xl border border-line object-cover" />}
    </div>
  );
}
