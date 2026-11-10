import Link from 'next/link';
import { pairingPoints } from '@/domain/scoring';
import { fixtureTotals, toRecord } from '@/data/derive';
import type { FixtureState } from '@/data/store';
import { fmtDate, roundLabel } from '@/lib/format';
import { StatusTag, TeamBadge, team } from './ui';

export function FixtureCard({ f, link = true }: { f: FixtureState; link?: boolean }) {
  const t = fixtureTotals(toRecord(f));
  const started = t.done > 0;
  const body = (
    <div className="card-lime transition hover:border-lime">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wider text-bone/70">
        <span>{roundLabel[f.round]}{f.group ? ` · Group ${f.group}` : ''} · {fmtDate(f.date)}{f.time ? ` · ${f.time}` : ''}{f.court ? ` · Court ${f.court}` : ''}</span>
        <StatusTag status={f.status} />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-3"><TeamBadge id={f.home} size={44} /><span className="font-bold leading-tight">{team(f.home).name}</span></div>
        <div className="display text-3xl tabular-nums" aria-label={started ? `${t.homePts} to ${t.awayPts}` : 'not started'}>
          {started ? `${t.homePts} – ${t.awayPts}` : 'v'}
        </div>
        <div className="flex items-center justify-end gap-3 text-right"><span className="font-bold leading-tight">{team(f.away).name}</span><TeamBadge id={f.away} size={44} /></div>
      </div>
      {f.status !== 'final' && started && <p className="mt-2 text-xs text-amber-300">Provisional – only verified results count towards the table.</p>}
    </div>
  );
  return link ? <Link href={`/fixtures/${f.id}`} className="block">{body}</Link> : body;
}

export { pairingPoints };
