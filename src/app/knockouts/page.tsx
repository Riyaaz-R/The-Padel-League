import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTitle, TeamBadge, team } from '@/components/ui';
import { bracket } from '@/data/derive';
import { loadState } from '@/data/db';
import { toRecord } from '@/data/derive';
import { fixtureOutcome, type ResolvedSlot, type Slot } from '@/domain/knockout';
import { fmtDate, fmtRand } from '@/lib/format';
import { SEASON } from '@/data/seed';

export const metadata: Metadata = { title: 'Knockouts' };
export const dynamic = 'force-dynamic';

const COLS: { title: string; slots: Slot[] }[] = [
  { title: 'Quarter-finals · 4 Dec', slots: ['QF1', 'QF2', 'QF3', 'QF4'] },
  { title: 'Semi-finals · 11 Dec', slots: ['SF1', 'SF2'] },
  { title: 'Final · 18 Dec', slots: ['FINAL', 'THIRD'] },
];
const PLATE: { title: string; slots: Slot[] }[] = [
  { title: 'Plate semi-finals · 11 Dec', slots: ['PSF1', 'PSF2'] },
  { title: 'Plate Final · 18 Dec', slots: ['PFINAL', 'PTHIRD'] },
];
const NAME: Record<string, string> = { FINAL: 'Final', THIRD: '3rd/4th', PFINAL: 'Plate Final', PTHIRD: 'Plate 3rd/4th' };

function Side({ id, label, pts, win }: { id?: string; label: string; pts?: number; win?: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-1 ${win ? 'font-bold text-lime' : ''}`}>
      {id ? <TeamBadge id={id} size={28} /> : <span className="inline-block h-7 w-7 rounded-lg border border-dashed border-line" />}
      <span className={id ? '' : 'text-bone/50'}>{id ? team(id).name : label}</span>
      {pts !== undefined && <span className="ml-auto tabular-nums">{pts}</span>}
    </div>
  );
}

export default async function Knockouts() {
  const s = await loadState();
  const slots = bracket(s);
  const render = (r: ResolvedSlot) => {
    const f = s.fixtures.find((x) => x.slot === r.slot);
    const o = f ? fixtureOutcome(toRecord(f)) : null;
    const started = o && o.status !== 'incomplete' || (f && f.status !== 'scheduled');
    const winner = o?.status === 'decided' && f?.status === 'final' ? o.winner : undefined;
    const body = (
      <div className="card min-w-[230px]">
        <p className="mb-1 text-xs uppercase tracking-widest text-bone/60">{NAME[r.slot] ?? r.slot}{f ? ` · ${fmtDate(f.date)}` : ''}</p>
        <Side id={r.home} label={r.homeLabel} pts={started ? o?.homePts : undefined} win={winner === 'home'} />
        <Side id={r.away} label={r.awayLabel} pts={started ? o?.awayPts : undefined} win={winner === 'away'} />
        {o?.status === 'tied' && <p className="text-xs text-amber-300">Level: deciding set required</p>}
      </div>
    );
    return f ? <Link key={r.slot} href={`/fixtures/${f.id}`}>{body}</Link> : <div key={r.slot}>{body}</div>;
  };
  const cols = (list: typeof COLS) => (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {list.map((c) => (
        <div key={c.title} className="flex flex-col justify-around gap-3">
          <h2 className="text-lg text-bone/80">{c.title}</h2>
          {c.slots.map((sl) => render(slots.find((x) => x.slot === sl)!))}
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-8">
      <PageTitle sub={`All 8 teams qualify. Group positions set the seeding. Prize pot: ${fmtRand(SEASON.prizePot)}.`}>Knockouts</PageTitle>
      <section aria-label="Main bracket">{cols(COLS)}</section>
      <section aria-label="Plate bracket"><h2 className="slashes mb-2 text-3xl">Plate</h2>{cols(PLATE)}</section>
    </div>
  );
}
