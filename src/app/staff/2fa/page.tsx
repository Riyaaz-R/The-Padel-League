import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';
import { verifyTotp } from '../actions';

export const metadata: Metadata = { title: 'Two-factor code', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function TwoFactor({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { db, staff, signedIn } = await getStaff();
  if (!signedIn || !staff) redirect('/staff');
  if (staff.aal2) redirect('/admin');

  const { data: factors } = await db.auth.mfa.listFactors();
  const verified = factors?.totp.find((f) => f.status === 'verified');
  let enrol: { id: string; qr: string; secret: string } | null = null;
  if (!verified) {
    for (const f of factors?.all ?? []) if (f.status === 'unverified') await db.auth.mfa.unenroll({ factorId: f.id });
    const e = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Padel League' });
    if (e.data) enrol = { id: e.data.id, qr: e.data.totp.qr_code, secret: e.data.totp.secret };
  }
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-4xl">{verified ? 'Enter your code' : 'Set up 2-factor sign-in'}</h1>
      <form action={verifyTotp} className="card space-y-3">
        {enrol && (<>
          <p className="text-sm">Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password), then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrol.qr} alt="Authenticator QR code" className="mx-auto h-44 w-44 rounded bg-white p-2" />
          <p className="break-all text-center text-xs text-bone/60">Or type this key: <code>{enrol.secret}</code></p>
        </>)}
        <input type="hidden" name="factorId" value={verified?.id ?? enrol?.id ?? ''} />
        <label className="block text-sm">6-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className="input mt-1 text-center text-2xl tracking-widest" /></label>
        {error && <p role="alert" className="text-red-300">That code was not correct. Try the next one.</p>}
        <button className="btn w-full">Verify</button>
      </form>
    </div>
  );
}
