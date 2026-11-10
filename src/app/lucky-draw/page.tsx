import type { Metadata } from 'next';
import Image from 'next/image';
import { PageTitle } from '@/components/ui';
import { LUCKY_DRAW } from '@/data/luckydraw';
import { SEASON } from '@/data/seed';
import { fmtDate, todaySAST } from '@/lib/format';
import { loadWinners } from '@/data/winners';

export const metadata: Metadata = { title: 'TPC Café Lucky Draw', description: 'Spend at TPC Padel Café during the league and win weekly prizes and the grand prize.' };
export const dynamic = 'force-dynamic';

export default async function LuckyDraw() {
  const winners = await loadWinners();
  const today = todaySAST();
  const started = today >= SEASON.weeks[0].date;
  // current week = the latest league Friday that has arrived (week 1 until the competition starts)
  const current = started ? [...SEASON.weeks].reverse().find((w) => w.date <= today)!.week : 0;
  const over = today > SEASON.weeks[5].date;
  const now = LUCKY_DRAW.prizes.find((p) => p.week === (current || 1))!;

  return (
    <div className="space-y-10">
      <PageTitle sub={`${LUCKY_DRAW.tagline} ${LUCKY_DRAW.runs}.`}>{LUCKY_DRAW.title}</PageTitle>

      <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-6">
          <div className="card-lime">
            <p className="text-xs uppercase tracking-widest text-bone/60">{over ? 'Competition finished' : started ? `This week · Week ${current}` : `Starts ${fmtDate(SEASON.weeks[0].date, { weekday: 'long', day: 'numeric', month: 'long' })}`}</p>
            <p className="display text-3xl text-lime sm:text-4xl">{over ? 'Thanks for playing' : now.prize}</p>
            {!over && <p className="mt-1 text-sm text-bone/70">Spend at TPC Padel Café to enter. Every entry also counts towards the grand prize draw.</p>}
          </div>

          <div>
            <h2 className="slashes mb-3 text-2xl">Prizes</h2>
            <ol className="grid gap-2 sm:grid-cols-2">
              {LUCKY_DRAW.prizes.map((p) => {
                const isNow = !over && p.week === current;
                const grand = 'grand' in p && p.grand;
                return (
                  <li key={p.week} className={`card flex items-start gap-3 ${isNow ? '!border-lime' : ''} ${grand ? 'sm:col-span-2' : ''}`}>
                    <span className="display shrink-0 rounded-lg bg-lime px-2 py-1 text-lg text-ink">Week {p.week}</span>
                    <span><span className="font-semibold">{p.prize}</span>{isNow && <span className="ml-2 tag bg-lime">This week</span>}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h2 className="slashes mb-3 text-2xl">Winners</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {LUCKY_DRAW.prizes.map((p) => {
                const w = winners.find((x) => x.week === p.week);
                return (
                  <li key={p.week} className={`card overflow-hidden !p-0 ${'grand' in p && p.grand ? 'sm:col-span-2' : ''}`}>
                    {w?.photoUrl && <Image src={w.photoUrl} alt={`${w.name}, Week ${p.week} winner`} width={600} height={600} sizes="(max-width: 640px) 100vw, 20rem" className="h-56 w-full object-cover" />}
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-widest text-bone/60">Week {p.week} · {p.prize}</p>
                      {w ? (<><p className="display text-2xl text-lime">{w.name}</p>{w.caption && <p className="text-sm text-bone/70">{w.caption}</p>}</>)
                        : <p className="text-bone/60">To be announced</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card overflow-x-auto">
            <h2 className="mb-2 text-2xl">Spend more, get more entries</h2>
            <table className="w-full max-w-md text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-bone/60"><th className="py-1">Spend</th><th>Entries</th></tr></thead>
              <tbody>{LUCKY_DRAW.entries.map((e) => (
                <tr key={e.spend} className="border-t border-line"><td className="py-2 font-semibold">{e.spend}</td><td className="display text-xl text-lime">{e.entries}</td></tr>))}</tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="mb-2 text-2xl">Competition rules</h2>
            <ol className="list-decimal space-y-1 pl-5">{LUCKY_DRAW.rules.map((r, i) => <li key={i}>{r}</li>)}</ol>
            <p className="mt-3 text-xs text-bone/60">Run by TPC Padel Café. Source: the official TPC Café Lucky Draw poster. Ask at the café for any queries.</p>
          </div>
        </div>

        <Image src="/lucky-draw/poster.webp" alt="TPC Café Lucky Draw poster: 6 weeks, 6 prizes, 1 epic grand prize, with the weekly prizes, entries table and competition rules"
          width={1100} height={1559} sizes="(max-width: 768px) 100vw, 22rem" className="h-auto w-full rounded-2xl border border-line md:sticky md:top-24" priority />
      </section>
    </div>
  );
}
