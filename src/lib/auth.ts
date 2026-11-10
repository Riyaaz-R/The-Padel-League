import 'server-only';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { userClient } from '@/data/db';

export type Role = 'super_admin' | 'committee_admin' | 'scorer' | 'auctioneer' | 'treasurer' | 'captain' | 'owner';
export interface Staff { userId: string; email: string; role: Role; name: string; aal2: boolean }

/**
 * Staff sign-in is Supabase Auth (email + password) plus mandatory TOTP. A signed-in user with no `profiles` row
 * has no staff role and no access: RLS only trusts rows in `profiles`, and committee policies also require aal2.
 */
export async function getStaff(): Promise<{ db: SupabaseClient; staff: Staff | null; signedIn: boolean }> {
  const db = await userClient();
  const { data: u } = await db.auth.getUser(); // verified against the Auth server, not just the cookie
  if (!u.user) return { db, staff: null, signedIn: false };
  const [{ data: aal }, { data: profile }] = await Promise.all([
    db.auth.mfa.getAuthenticatorAssuranceLevel(),
    db.from('profiles').select('role, display_name').eq('user_id', u.user.id).maybeSingle(),
  ]);
  if (!profile) return { db, staff: null, signedIn: true };
  return { db, signedIn: true, staff: { userId: u.user.id, email: u.user.email ?? '', role: profile.role as Role, name: profile.display_name, aal2: aal?.currentLevel === 'aal2' } };
}

export const isCommittee = (s: Staff | null) => Boolean(s?.aal2 && (s.role === 'super_admin' || s.role === 'committee_admin'));
export const canScore = (s: Staff | null) => Boolean(s?.aal2 && (isCommittee(s) || s?.role === 'scorer'));

/** For pages: redirects to sign-in / 2FA as needed. */
export async function requireStaffPage(need: 'committee' | 'scorer') {
  const ctx = await getStaff();
  if (!ctx.staff) redirect('/staff');
  if (!ctx.staff.aal2) redirect('/staff/2fa');
  if (need === 'committee' && !isCommittee(ctx.staff)) redirect(canScore(ctx.staff) ? '/admin/live' : '/staff');
  if (need === 'scorer' && !canScore(ctx.staff)) redirect('/staff');
  return { db: ctx.db, staff: ctx.staff };
}

/** For server actions: throws if the caller is not authorised. */
export async function requireStaffAction(need: 'committee' | 'scorer') {
  const ctx = await getStaff();
  const ok = need === 'committee' ? isCommittee(ctx.staff) : canScore(ctx.staff);
  if (!ok || !ctx.staff) throw new Error('Not authorised');
  return { db: ctx.db, staff: ctx.staff };
}

export async function audit(db: SupabaseClient, staff: Staff, action: string, detail: string, reason?: string, rowId?: string) {
  await db.from('audit_log').insert({ actor: staff.userId, action, row_id: rowId, after: { detail }, reason: reason ?? null });
}
