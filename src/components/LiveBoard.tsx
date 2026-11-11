'use client';
import Image from 'next/image';
import { useSnapshot } from '@/lib/use-snapshot';
import type { SnapFixture, Snapshot } from '@/lib/snapshot';

const LABEL = { ladies: 'Ladies', low: 'Low', high_1: 'High 1', high_2: 'High 2' } as const;
const COLOUR = { ladies: 'bg-ladies', low: 'bg-low', high_1: 'bg-high', high_2: 'bg-high' } as const;

const ORDER: Record<string, number> = { live: 0, scheduled: 1, awaiting_confirmation: 2, disputed: 2, final: 3 };

/**
 * The fixtures the live screens show. Every LIVE match is always included (several can run on different courts),
 * listed first, followed by the rest of that day's matches: upcoming, then completed.
 */
export function activeFixtures(s: Snapshot): SnapFixture[] {
  const live = s.fixtures.filter((f) => f.status === 'live');
  let day: SnapFixture[];
  if (live.length) day = s.fixtures.filter((f) => f.date === live[0].date);
  else {
    const today = s.fixtures.filter((f) => f.date === s.today);
    const next = s.fixtures.filter((f) => f.date >= s.today).sort((a, b) => a.date.localeCompare(b.date))[0];
    day = today.length ? today : next ? s.fixtures.filter((f) => f.date === next.date) : s.fixtures.slice(-4);
  }
  const all = [...day, ...live.filter((f) => !day.includes(f))];
  return all.sort((a, b) => (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99') || (a.court ?? '').localeCompare(b.court ?? '', undefined, { numeric: true }));
}

export function ConnectionBadge({ online, updated }: { online: boolean; updated: Date | null }) {
  return (
    <span role="status" className={`text-xs ${online ? 'text-lime' : 'text-amber-300'}`}>
      {online ? '● Connected' : '● Reconnecting…'}{updated && <span className="ml-2 text-bone/50">updated {updated.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</span>}
    </span>
  );
}

export function FixtureLive({ f, big = false }: { f: SnapFixture; big?: boolean }) {
  return (
    <section className="card-lime">
      <div className={`flex items-center justify-between uppercase tracking-widest text-bone/70 ${big ? "mb-[0.6vh] text-[1.6vh]" : "mb-2 text-xs"}`}>
        <span>{f.court ? `Court ${f.court}` : 'Court TBC'}{f.time ? ` · ${f.time}` : ''}</span>
        {f.status === 'live' ? <span className="font-bold text-red-400"><span className="live-dot">●</span> LIVE</span> : f.status === 'final' ? <span className="font-bold text-lime">COMPLETED</span> : <span>{f.status === 'scheduled' ? 'Upcoming' : f.status.replace('_', ' ')}</span>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2"><Image src={f.home.logo} alt="" width={64} height={64} className={`rounded-xl ${big ? 'h-[5vh] w-[5vh]' : 'h-12 w-12'}`} /><span className={`display leading-none ${big ? 'text-[2.8vh]' : 'text-xl'}`}>{f.home.name}</span></div>
        <div className={`display tabular-nums ${big ? 'text-[5.4vh]' : 'text-4xl'}`}>{f.homePts}<span className="mx-2 text-lime">–</span>{f.awayPts}</div>
        <div className="flex items-center justify-end gap-2 text-right"><span className={`display leading-none ${big ? 'text-[2.8vh]' : 'text-xl'}`}>{f.away.name}</span><Image src={f.away.logo} alt="" width={64} height={64} className={`rounded-xl ${big ? 'h-[5vh] w-[5vh]' : 'h-12 w-12'}`} /></div>
      </div>
      <ul className={big ? "mt-[0.8vh] space-y-[0.4vh]" : "mt-3 space-y-1"}>
        {f.pairings.map((p) => (
          <li key={p.slot} className={`grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 rounded-lg bg-ink/60 px-2 py-[0.3vh] ${big ? 'text-[1.95vh] leading-tight' : 'text-sm'}`}>
            <span className={`tag ${COLOUR[p.slot]}`}>{LABEL[p.slot]}</span>
            <span className={p.winner === 'home' ? 'font-bold text-lime' : ''}>{p.home}</span>
            <span className="display text-center tabular-nums">
              {p.result ? p.text : p.live ? <span className="text-red-300">S{p.live.setNo} {p.live.gamesH}–{p.live.gamesA}{p.live.tiebreak ? ' TB' : ''}</span> : '–'}
            </span>
            <span className={`text-right ${p.winner === 'away' ? 'font-bold text-lime' : ''}`}>{p.away}</span>
          </li>
        ))}
      </ul>
      {f.status !== 'final' && f.status !== 'scheduled' && <p className="mt-1 text-xs text-amber-300">Provisional: only Completed matches count towards the table.</p>}
    </section>
  );
}

export function LiveBoard() {
  const { snap, online, updated } = useSnapshot();
  if (!snap) return <p className="text-bone/70">Loading live scores…</p>;
  const list = activeFixtures(snap);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-bone/70">{list.some((f) => f.status === 'live') ? 'Matches in play' : 'Tonight’s fixtures'}</p><ConnectionBadge online={online} updated={updated} /></div>
      {list.length ? list.map((f) => <FixtureLive key={f.id} f={f} />) : <p>No fixtures scheduled.</p>}
      <p className="text-xs text-bone/50">Live scores are provisional until both captains confirm and the committee verifies. Tables use verified results only.</p>
    </div>
  );
}
