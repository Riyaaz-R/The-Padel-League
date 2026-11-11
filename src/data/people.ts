import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fullName } from '@/domain/names';
import type { Division } from '@/domain/types';
import { storageUrl } from '@/lib/media';
import type { TeamRow } from './store';

export interface PersonRow {
  id: string; personId: string; first: string; surname: string; corrected: string; name: string; division: Division;
  teamSlug: string; status: string; price: number | null; injured: boolean; suspendedUntil: string | null;
  isMinor: boolean; guardianConsent: boolean; photoConsent: boolean; phone: string; email: string; emergency: string; photoUrl?: string;
}

/** Every player in the season with all editable fields (staff only: includes contact details). */
export async function loadPeople(db: SupabaseClient, seasonId: string, teams: TeamRow[]): Promise<PersonRow[]> {
  const { data, error } = await db.from('season_players')
    .select('id, person_id, division, team_id, status, price, injured, suspended_until, persons(first_name, second_name, corrected_name, is_minor, guardian_consent, photo_consent, phone, email, emergency_contact, photo_path)')
    .eq('season_id', seasonId);
  if (error) throw new Error(error.message);
  const slug = new Map(teams.map((t) => [t.uuid, t.id]));
  return (data ?? []).map((r) => {
    const p = (Array.isArray(r.persons) ? r.persons[0] : r.persons) as Record<string, string | boolean | null>;
    return {
      id: r.id, personId: r.person_id, first: p.first_name as string, surname: (p.second_name as string) ?? '', corrected: (p.corrected_name as string) ?? '',
      name: fullName(p.first_name as string, p.second_name as string | null, p.corrected_name as string | null), division: r.division as Division,
      teamSlug: r.team_id ? slug.get(r.team_id) ?? '' : '', status: r.status, price: r.price === null ? null : Number(r.price), injured: r.injured, suspendedUntil: r.suspended_until,
      isMinor: Boolean(p.is_minor), guardianConsent: Boolean(p.guardian_consent), photoConsent: Boolean(p.photo_consent),
      phone: (p.phone as string) ?? '', email: (p.email as string) ?? '', emergency: (p.emergency_contact as string) ?? '',
      photoUrl: p.photo_path ? storageUrl('player-photos', p.photo_path as string) : undefined,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
