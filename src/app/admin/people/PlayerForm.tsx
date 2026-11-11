import Image from 'next/image';
import { PhotoPicker } from '@/components/PhotoPicker';
import type { PersonRow } from '@/data/people';
import type { TeamRow } from '@/data/store';

const STATUSES: [string, string][] = [['approved', 'Approved'], ['registered', 'Registered'], ['in_auction', 'In auction'], ['sold', 'Sold'], ['unsold', 'Unsold'], ['withdrawn', 'Withdrawn'], ['replaced', 'Replaced']];

/** Add/edit form for one player. Works on phones: single column, large touch targets. */
export function PlayerForm({ action, player, teams, dup, submitLabel }: { action: (fd: FormData) => Promise<void>; player?: PersonRow; teams: TeamRow[]; dup: boolean; submitLabel: string }) {
  return (
    <form action={action} className="space-y-6">
      {player && <input type="hidden" name="id" value={player.id} />}

      <fieldset className="card grid gap-3 sm:grid-cols-2">
        <legend className="px-1 text-lg">Name</legend>
        <label className="block text-sm">First name *<input name="first_name" required maxLength={60} defaultValue={player?.first} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm">Surname (optional)<input name="surname" maxLength={60} defaultValue={player?.surname} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm sm:col-span-2">Corrected full name (optional)
          <input name="corrected_name" maxLength={120} defaultValue={player?.corrected} className="input mt-1" autoComplete="off" />
          <span className="mt-1 block text-xs text-bone/60">Only if the name should show differently from first name + surname. Leave blank otherwise. A player with one name is fine: leave the surname empty and add it later.</span></label>
      </fieldset>

      <fieldset className="card grid gap-3 sm:grid-cols-2">
        <legend className="px-1 text-lg">Level and team</legend>
        <label className="block text-sm">Level *<select name="division" required defaultValue={player?.division ?? ''} className="input mt-1">
          {!player && <option value="" disabled>Choose a level</option>}<option value="ladies">Ladies</option><option value="high">High</option><option value="low">Low</option></select></label>
        <label className="block text-sm">Team<select name="team" defaultValue={player?.teamSlug ?? ''} className="input mt-1"><option value="">No team (player pool)</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="block text-sm">Status<select name="status" defaultValue={player?.status ?? 'approved'} className="input mt-1">{STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block text-sm">Price (auction, optional)<input name="price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={player?.price ?? ''} className="input mt-1" /></label>
        <label className="block text-sm">Suspended until (optional)<input name="suspended_until" type="date" defaultValue={player?.suspendedUntil ?? ''} className="input mt-1" /></label>
        <label className="flex items-center gap-2 text-sm sm:self-end"><input type="checkbox" name="injured" defaultChecked={player?.injured} className="h-5 w-5" /> Injured (cannot be picked for pairings)</label>
        {player && <p className="text-xs text-bone/60 sm:col-span-2">Changing a player’s team or level takes them out of any scheduled or live pairings. Completed fixtures keep their history.</p>}
      </fieldset>

      <fieldset className="card space-y-3">
        <legend className="px-1 text-lg">Photo</legend>
        {player?.photoUrl && (
          <div className="flex items-center gap-3">
            <Image src={player.photoUrl} alt={`Current photo of ${player.name}`} width={96} height={96} className="h-24 w-24 rounded-xl border border-line object-cover" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_photo" className="h-5 w-5" /> Remove this photo</label>
          </div>)}
        <PhotoPicker label={player?.photoUrl ? 'Replace photo (optional)' : 'Photo (optional)'} maxSize={1200} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="photo_consent" defaultChecked={player?.photoConsent} className="mt-1 h-5 w-5" /> The player agreed to their photo being shown on the website</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="is_minor" defaultChecked={player?.isMinor} className="mt-1 h-5 w-5" /> Under 18 (name shown as first name and initial unless guardian consent is ticked)</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="guardian_consent" defaultChecked={player?.guardianConsent} className="mt-1 h-5 w-5" /> Guardian consent given</label>
        </div>
      </fieldset>

      <fieldset className="card grid gap-3 sm:grid-cols-2">
        <legend className="px-1 text-lg">Contact details (staff only, never shown publicly)</legend>
        <label className="block text-sm">Phone<input name="phone" type="tel" defaultValue={player?.phone} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm">Email<input name="email" type="email" defaultValue={player?.email} className="input mt-1" autoComplete="off" /></label>
        <label className="block text-sm sm:col-span-2">Emergency contact<input name="emergency_contact" defaultValue={player?.emergency} className="input mt-1" autoComplete="off" /></label>
      </fieldset>

      {dup && <label className="card flex items-start gap-2 border-amber-400 text-sm"><input type="checkbox" name="force" className="mt-1 h-5 w-5" /> <span><strong>Go ahead anyway.</strong> Another player has this name; tick this only if it is a different person.</span></label>}
      <button className="btn w-full sm:w-auto">{submitLabel}</button>
    </form>
  );
}
