import type { Division } from './types';

/** The levels used across the app (pairing slots, squad rules, tables). */
export const LEVELS: readonly Division[] = ['ladies', 'high', 'low'] as const;
export const isLevel = (v: string): v is Division => (LEVELS as readonly string[]).includes(v);

/** What the public sees: a committee-corrected name wins, otherwise first name + surname. A single name stays single. */
export function fullName(first: string, surname?: string | null, corrected?: string | null): string {
  const c = corrected?.trim();
  if (c) return c;
  return [first, surname].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
}

/** Lower-case, accent-free, letters and digits only: "Sa'ad  Patel" and "saad patel" compare equal. */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export interface NamedPlayer { id: string; name: string }
/** Other players whose name matches the candidate (ignoring `exceptId`, e.g. the player being edited). */
export function findDuplicates(candidate: string, players: NamedPlayer[], exceptId?: string): NamedPlayer[] {
  const n = normalizeName(candidate);
  if (!n) return [];
  return players.filter((p) => p.id !== exceptId && normalizeName(p.name) === n);
}

/** Turns "Sternie Van Staden" into first "Sternie" + surname "Van Staden". Mirrors the one-off SQL split used in migration 0006. */
export function splitFullName(full: string): { first: string; surname: string | null } {
  const s = full.trim().replace(/\s+/g, ' ');
  const m = /^(.*?)\s+((?:(?:van|von|de|du|da|le|la|di|der|den|ten|ter)\s+)*\S+)$/i.exec(s);
  return m ? { first: m[1], surname: m[2] } : { first: s, surname: null };
}

export interface PlayerInput { firstName: string; surname?: string; division: string }
/** Returns a list of problems (empty = valid). */
export function validatePlayerInput(p: PlayerInput): string[] {
  const errors: string[] = [];
  if (!p.firstName.trim()) errors.push('First name cannot be blank');
  if (p.firstName.trim().length > 60) errors.push('First name is too long (60 characters at most)');
  if ((p.surname ?? '').trim().length > 60) errors.push('Surname is too long (60 characters at most)');
  if (!isLevel(p.division)) errors.push('Choose a level: Ladies, High or Low');
  return errors;
}
