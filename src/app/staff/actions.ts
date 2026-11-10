'use server';
import { redirect } from 'next/navigation';
import { userClient } from '@/data/db';

export async function login(fd: FormData) {
  const email = String(fd.get('email') ?? '').trim(), password = String(fd.get('password') ?? '');
  const db = await userClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) redirect('/staff?error=1');
  redirect('/staff/2fa');
}

export async function verifyTotp(fd: FormData) {
  const factorId = String(fd.get('factorId') ?? ''), code = String(fd.get('code') ?? '').replace(/\s/g, '');
  const db = await userClient();
  const ch = await db.auth.mfa.challenge({ factorId });
  if (ch.error) redirect('/staff/2fa?error=1');
  const v = await db.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
  if (v.error) redirect('/staff/2fa?error=1');
  redirect('/admin');
}

export async function logout() {
  const db = await userClient();
  await db.auth.signOut();
  redirect('/');
}
