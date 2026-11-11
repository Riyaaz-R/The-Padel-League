import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff, isCommittee } from '@/lib/auth';
import { logout } from '../staff/actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await getStaff();
  if (!staff) redirect('/staff');
  if (!staff.aal2) redirect('/staff/2fa');
  return (
    <div>
      <nav aria-label="Admin" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-3 py-2">
        {isCommittee(staff) && <Link href="/admin" className="font-bold text-lime">Dashboard</Link>}
        {isCommittee(staff) && <Link href="/admin/fixtures" className="font-semibold hover:text-lime">Fixtures</Link>}
        <Link href="/admin/live" className="hover:text-lime">Live scoring</Link>
        {isCommittee(staff) && <Link href="/admin/people" className="hover:text-lime">Players &amp; Teams</Link>}
        {isCommittee(staff) && <Link href="/admin/sponsors" className="hover:text-lime">Manage Sponsors</Link>}
        {isCommittee(staff) && <Link href="/admin/banner" className="hover:text-lime">Sponsor Banner</Link>}
        {isCommittee(staff) && <Link href="/admin/lucky-draw" className="hover:text-lime">Lucky Draw winners</Link>}
        <span className="text-xs text-bone/60">{staff.name} · {staff.role.replace('_', ' ')}</span>
        <form action={logout} className="ml-auto"><button className="btn-ghost">Sign out</button></form>
      </nav>
      {children}
    </div>
  );
}
