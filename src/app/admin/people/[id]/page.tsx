import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/ConfirmButton';
import { loadState } from '@/data/db';
import { loadPeople } from '@/data/people';
import { requireStaffPage } from '@/lib/auth';
import { deletePlayer, savePlayer } from '../actions';
import { PlayerForm } from '../PlayerForm';
import { PeopleNav } from '../PeopleNav';

export const dynamic = 'force-dynamic';

export default async function EditPlayer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; dup?: string }> }) {
  const { id } = await params; const { ok, error, dup } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const s = await loadState();
  const player = (await loadPeople(db, s.seasonId, s.teams)).find((p) => p.id === id);
  if (!player) notFound();
  const used = await db.from('pairings').select('id', { count: 'exact', head: true }).or(`home_p1.eq.${id},home_p2.eq.${id},away_p1.eq.${id},away_p2.eq.${id}`);

  return (
    <div className="max-w-3xl">
      <PeopleNav active="players" />
      <Link href="/admin/people" className="text-sm text-bone/70 hover:text-lime">← All players</Link>
      <h1 className="mb-4 mt-2 text-3xl">{player.name}</h1>
      {ok && <p role="status" className="card mb-4 border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card mb-4 border-red-400 text-red-200">{error}</p>}
      <PlayerForm action={savePlayer} player={player} teams={s.teams} dup={dup === '1'} submitLabel="Save changes" />

      <section className="card mt-8 space-y-3 border-red-400/40">
        <h2 className="text-xl">Delete player</h2>
        <p className="text-sm text-bone/70">
          {(used.count ?? 0) > 0
            ? `${player.name} appears in ${used.count} fixture pairing(s). To keep results intact they cannot be deleted. Set their status to “Withdrawn” instead.`
            : 'This permanently removes the player and their photo. It cannot be undone.'}
        </p>
        {(used.count ?? 0) === 0 && (
          <form action={deletePlayer}><input type="hidden" name="id" value={player.id} />
            <ConfirmButton className="btn-ghost text-red-300" message={`Delete ${player.name}? This cannot be undone.`} ariaLabel={`Delete ${player.name}`}>Delete {player.name}</ConfirmButton></form>)}
      </section>
    </div>
  );
}
