import Link from 'next/link';
import { loadState } from '@/data/db';
import { SEASON } from '@/data/seed';
import { requireStaffPage } from '@/lib/auth';
import { roundLabel } from '@/lib/format';
import { createFixture } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function NewFixture({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await requireStaffPage('committee');
  const s = await loadState();
  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/fixtures" className="text-sm text-bone/70 hover:text-lime">← All fixtures</Link>
      <h1 className="text-3xl">Add a fixture</h1>
      <p className="text-sm text-bone/70">No score is needed. The fixture starts as <strong>Scheduled</strong>: add its players, go live when it starts, and complete it with the result afterwards.</p>
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}
      <form action={createFixture} className="card grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Round *<select name="round" required defaultValue="group" className="input mt-1">{Object.entries(roundLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="text-sm">Group (group stage only)<select name="group" className="input mt-1"><option value="">–</option><option value="A">Group A</option><option value="B">Group B</option></select></label>
        <label className="text-sm">Week *<select name="week" required defaultValue={1} className="input mt-1">{SEASON.weeks.map((w) => <option key={w.week} value={w.week}>Week {w.week} · {w.label}</option>)}</select></label>
        <label className="text-sm">Date *<input type="date" name="date" required defaultValue={SEASON.weeks[0].date} className="input mt-1" /></label>
        <label className="text-sm">Home team *<select name="home" required defaultValue="" className="input mt-1"><option value="" disabled>Choose a team</option>{s.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm">Away team *<select name="away" required defaultValue="" className="input mt-1"><option value="" disabled>Choose a team</option>{s.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm">Start time<input type="time" name="time" className="input mt-1" /></label>
        <label className="text-sm">Court<input name="court" maxLength={20} className="input mt-1" /></label>
        <div className="sm:col-span-2"><button className="btn w-full sm:w-auto">Create fixture</button></div>
      </form>
    </div>
  );
}
