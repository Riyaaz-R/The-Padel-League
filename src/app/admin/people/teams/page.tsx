import Link from 'next/link';
import { PhotoPicker } from '@/components/PhotoPicker';
import { DivisionTag, TeamBadge } from '@/components/ui';
import { loadState } from '@/data/db';
import { requireStaffPage } from '@/lib/auth';
import type { Division } from '@/domain/types';
import { createTeam, saveTeam } from '../actions';
import { PeopleNav } from '../PeopleNav';

export const dynamic = 'force-dynamic';

export default async function TeamsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  await requireStaffPage('committee');
  const s = await loadState();
  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-3xl">Players &amp; Teams</h1>
      <p className="mb-4 text-sm text-bone/70">Team changes show on the public pages straight away.</p>
      <PeopleNav active="teams" />
      {ok && <p role="status" className="card mb-4 border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card mb-4 border-red-400 text-red-200">{error}</p>}

      <div className="space-y-6">
        {s.teams.map((t) => {
          const roster = s.players.filter((p) => p.teamId === t.id);
          const hasGroupFixtures = s.fixtures.some((f) => f.round === 'group' && (f.home === t.id || f.away === t.id));
          return (
            <section key={t.id} id={`team-${t.uuid}`} className="card scroll-mt-24 space-y-4">
              <div className="flex items-center gap-3"><TeamBadge id={t.id} size={56} />
                <div><h2 className="text-2xl" style={t.colour ? { color: t.colour } : undefined}>{t.name}</h2><p className="text-sm text-bone/70">{t.group ? `Group ${t.group}` : 'No group'} · {roster.length} players</p></div></div>
              <form action={saveTeam} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={t.uuid} />
                <label className="block text-sm">Team name *<input name="name" required maxLength={60} defaultValue={t.name} className="input mt-1" /></label>
                <label className="block text-sm">Short name * (2 to 4 letters)<input name="short" required maxLength={4} defaultValue={t.short} className="input mt-1 uppercase" /></label>
                <label className="block text-sm">Group
                  <select name="group" defaultValue={t.group ?? ''} className="input mt-1" disabled={hasGroupFixtures}><option value="">No group</option><option value="A">Group A</option><option value="B">Group B</option></select>
                  {hasGroupFixtures && <><input type="hidden" name="group" value={t.group ?? ''} /><span className="mt-1 block text-xs text-bone/60">Locked: this team already has group-stage fixtures.</span></>}</label>
                <div className="text-sm">Colour
                  <div className="mt-1 flex items-center gap-3"><input type="color" name="colour" defaultValue={t.colour ?? '#C6F000'} className="h-11 w-16 cursor-pointer rounded border border-line bg-ink" aria-label={`Colour for ${t.name}`} />
                    <label className="flex items-center gap-2"><input type="checkbox" name="no_colour" defaultChecked={!t.colour} className="h-5 w-5" /> No colour</label></div></div>
                <div className="sm:col-span-2"><PhotoPicker name="logo" label="New logo (optional, square works best)" maxSize={800} keepTransparency />
                  <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="remove_logo" className="h-5 w-5" /> Remove the logo (use the league badge)</label></div>
                <div className="sm:col-span-2"><button className="btn w-full sm:w-auto">Save {t.name}</button></div>
              </form>
              <details className="text-sm"><summary className="cursor-pointer text-bone/80">Roster ({roster.length})</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(['ladies', 'high', 'low'] as Division[]).map((d) => (
                    <div key={d}><DivisionTag d={d} />
                      <ul className="mt-2 space-y-1">{roster.filter((p) => p.division === d).map((p) => <li key={p.id}><Link href={`/admin/people/${p.id}`} className="hover:text-lime">{p.name}</Link></li>)}</ul></div>))}
                </div></details>
            </section>
          );
        })}

        <section className="card space-y-3">
          <h2 className="text-2xl">Add a team</h2>
          <form action={createTeam} className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">Team name *<input name="name" required maxLength={60} className="input mt-1" /></label>
            <label className="block text-sm">Short name * (2 to 4)<input name="short" required maxLength={4} className="input mt-1 uppercase" /></label>
            <label className="block text-sm">Group<select name="group" className="input mt-1"><option value="">No group yet</option><option value="A">Group A</option><option value="B">Group B</option></select></label>
            <div className="sm:col-span-3"><button className="btn w-full sm:w-auto">Add team</button><span className="ml-3 text-xs text-bone/60">Add the logo and colour afterwards by editing the team.</span></div>
          </form>
        </section>
      </div>
    </div>
  );
}
