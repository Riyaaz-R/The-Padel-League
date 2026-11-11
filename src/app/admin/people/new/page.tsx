import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import { createPlayer } from '../actions';
import { PlayerForm } from '../PlayerForm';
import { PeopleNav } from '../PeopleNav';

export const dynamic = 'force-dynamic';

export default async function NewPlayer({ searchParams }: { searchParams: Promise<{ error?: string; dup?: string }> }) {
  const { error, dup } = await searchParams;
  await requireStaffPage('committee');
  const s = await loadState();
  return (
    <div className="max-w-3xl">
      <PeopleNav active="new" />
      <h1 className="mb-4 text-3xl">Add a player</h1>
      {error && <p role="alert" className="card mb-4 border-red-400 text-red-200">{error}</p>}
      <PlayerForm action={createPlayer} teams={s.teams} dup={dup === '1'} submitLabel="Add player" />
    </div>
  );
}
