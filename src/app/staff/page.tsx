import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { dbConfigured } from '@/data/db';
import { getStaff } from '@/lib/auth';
import { login } from './actions';

export const metadata: Metadata = { title: 'Staff sign-in', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Staff({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (dbConfigured()) {
    const { staff, signedIn } = await getStaff();
    if (staff?.aal2) redirect('/admin');
    if (staff) redirect('/staff/2fa');
    if (signedIn) return <p className="card mx-auto max-w-md border-amber-400">You are signed in, but this account has no staff role. Ask the Super Admin to add you.</p>;
  }
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-4xl">Staff sign-in</h1>
      <form action={login} className="card space-y-3">
        <label className="block text-sm">Email<input type="email" name="email" required autoComplete="username" className="input mt-1" /></label>
        <label className="block text-sm">Password<input type="password" name="password" required autoComplete="current-password" className="input mt-1" /></label>
        {error && <p role="alert" className="text-red-300">Those details are not correct.</p>}
        <button className="btn w-full">Continue</button>
        <p className="text-xs text-bone/60">Staff accounts are created by the Super Admin. A code from your authenticator app is required next.</p>
      </form>
    </div>
  );
}
