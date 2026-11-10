import Image from 'next/image';
import { PhotoPicker } from '@/components/PhotoPicker';
import { LUCKY_DRAW } from '@/data/luckydraw';
import { SEASON } from '@/data/seed';
import { loadWinners } from '@/data/winners';
import { requireStaffPage } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { removeWinner, saveWinner } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminLuckyDraw({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  await requireStaffPage('committee');
  const winners = await loadWinners();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Lucky Draw winners</h1>
        <p className="text-sm text-bone/70">Add each weekly winner once TPC has announced them. They appear straight away on the public Lucky Draw page. Only add a name and photo with the winner’s agreement.</p>
      </div>
      {ok && <p role="status" className="card border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card border-red-400 text-red-200">{error}</p>}

      {LUCKY_DRAW.prizes.map((p) => {
        const w = winners.find((x) => x.week === p.week);
        return (
          <section key={p.week} id={`week-${p.week}`} className="card scroll-mt-24 space-y-3">
            <div>
              <h2 className="text-2xl">Week {p.week} · {fmtDate(SEASON.weeks[p.week - 1].date)}</h2>
              <p className="text-sm text-bone/70">Prize: {p.prize}</p>
            </div>
            <form action={saveWinner} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="week" value={p.week} />
              <label className="block text-sm">Winner’s name
                <input name="name" required maxLength={80} defaultValue={w?.name} className="input mt-1" placeholder="e.g. Aisha K." /></label>
              <label className="block text-sm">Caption (optional)
                <input name="caption" maxLength={200} defaultValue={w?.caption} className="input mt-1" placeholder="e.g. Collecting the prize at TPC Café" /></label>
              <div className="space-y-2">
                {w?.photoUrl && <Image src={w.photoUrl} alt={`Current photo of the Week ${p.week} winner`} width={160} height={160} className="h-32 w-32 rounded-xl border border-line object-cover" />}
                <PhotoPicker label={w?.photoUrl ? 'Replace photo (optional)' : 'Winner photo (optional)'} />
              </div>
              <div className="flex flex-col justify-end gap-3">
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" required defaultChecked={Boolean(w)} className="mt-1 h-5 w-5" />
                  <span>The winner has agreed to their name and photo being shown on the website and the TV screen.</span></label>
                <button className="btn">{w ? 'Update winner' : 'Publish winner'}</button>
              </div>
            </form>
            {w && (
              <form action={removeWinner}><input type="hidden" name="week" value={p.week} />
                <button className="btn-ghost text-red-300" aria-label={`Remove the Week ${p.week} winner and photo`}>Remove winner and photo</button></form>
            )}
          </section>
        );
      })}
    </div>
  );
}
