import Image from 'next/image';
import Link from 'next/link';
import { FixtureCard } from '@/components/FixtureCard';
import { TableView } from '@/components/TableView';
import { groupTables } from '@/data/derive';
import { SEASON } from '@/data/seed';
import { loadState } from '@/data/db';
import { daysUntil, fmtDate, fmtRand, todaySAST } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const s = await loadState();
  const today = todaySAST();
  const nextWeek = SEASON.weeks.find((w) => w.date >= today) ?? SEASON.weeks[5];
  const live = s.fixtures.filter((f) => f.status === 'live');
  const upcoming = s.fixtures.filter((f) => f.week === nextWeek.week);
  const results = s.fixtures.filter((f) => f.status === 'final').slice(-4).reverse();
  const tables = groupTables(s);
  const d = daysUntil(nextWeek.date);

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="slashes text-sm font-bold uppercase tracking-[0.3em] text-bone/70">TPC Friday Night League</p>
          <h1 className="mt-2 text-6xl leading-[0.9] sm:text-8xl">The Padel <span className="text-lime">League</span></h1>
          <p className="mt-4 max-w-xl text-lg text-bone/80">8 teams. 6 Fridays. One champion. Live scores, tables and the road to the Final at {SEASON.venue}.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/fixtures" className="btn">Fixtures</Link>
            <Link href="/live" className="btn-ghost">Live scores</Link>
            <Link href="/tables" className="btn-ghost">Tables</Link>
          </div>
        </div>
        <Image src="/logos/league-badge.webp" alt="The Padel League" width={260} height={260} priority className="mx-auto rounded-full border border-line" />
      </section>

      {live.length > 0 && (
        <Link href="/live" className="card-lime flex items-center gap-3 !border-red-500 hover:brightness-125">
          <span className="live-dot text-red-500">●</span><strong className="display text-2xl">Live now</strong>
          <span className="text-bone/80">{live.length} fixture{live.length > 1 ? 's' : ''} in play: tap for live scores</span>
        </Link>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card-lime"><p className="text-xs uppercase tracking-widest text-bone/60">Next Friday</p>
          <p className="display text-3xl">Week {nextWeek.week} of 6</p><p>{fmtDate(nextWeek.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="text-sm text-lime">{d > 0 ? `${d} day${d > 1 ? 's' : ''} to go` : d === 0 ? 'Tonight!' : ''}</p></div>
        <div className="card-lime sm:col-span-2"><p className="text-xs uppercase tracking-widest text-bone/60">Prize</p>
          <p className="display text-4xl text-lime">{fmtRand(SEASON.finalPrize)}</p><p>goes to the team that wins the Final.</p></div>
      </section>

      <section>
        <h2 className="slashes mb-3 text-3xl">{nextWeek.label} · {fmtDate(nextWeek.date)}</h2>
        {upcoming.length ? <div className="grid gap-3 md:grid-cols-2">{upcoming.map((f) => <FixtureCard key={f.id} f={f} />)}</div>
          : <p className="text-bone/70">Fixtures for this round appear once the previous round is complete.</p>}
      </section>

      {results.length > 0 && (
        <section><h2 className="slashes mb-3 text-3xl">Latest results</h2>
          <div className="grid gap-3 md:grid-cols-2">{results.map((f) => <FixtureCard key={f.id} f={f} />)}</div></section>
      )}

      <section><h2 className="slashes mb-3 text-3xl">Group tables</h2>
        <div className="grid gap-4 lg:grid-cols-2"><TableView table={tables.A} group="A" compact /><TableView table={tables.B} group="B" compact /></div></section>
    </div>
  );
}
