import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FixtureCard } from '@/components/FixtureCard';
import { DivisionTag } from '@/components/ui';
import { fixtureOutcome } from '@/domain/knockout';
import { pairingPoints } from '@/domain/scoring';
import { toRecord } from '@/data/derive';
import { SLOTS } from '@/data/store';
import { loadState } from '@/data/db';
import type { PlayerRow } from '@/data/store';
import { slotLabel } from '@/lib/format';
import { scoreText } from '@/lib/score-text';
import type { Division, PairingSlot } from '@/domain/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Fixture' };

const slotDivision: Record<PairingSlot, Division> = { ladies: 'ladies', low: 'low', high_1: 'high', high_2: 'high' };
const names = (players: PlayerRow[], ids: string[]) => ids.map((id) => players.find((p) => p.id === id)?.name ?? '').filter(Boolean).join(' & ') || 'To be submitted';

export default async function FixturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await loadState();
  const f = s.fixtures.find((x) => x.id === id);
  if (!f) notFound();
  const out = f.round !== 'group' ? fixtureOutcome(toRecord(f)) : null;
  return (
    <div className="space-y-6">
      <FixtureCard f={f} link={false} />
      {out?.status === 'tied' && <p className="card border-amber-400 text-amber-200">Fixture level on points: each captain nominates one pairing for a deciding set to 6 games (7-point tie-break at 6–6).</p>}
      <div className="grid gap-3">
        {SLOTS.map((slot) => {
          const p = f.pairings[slot];
          const pts = p.result ? pairingPoints(p.result) : null;
          return (
            <section key={slot} className="card">
              <div className="mb-2 flex items-center gap-2"><DivisionTag d={slotDivision[slot]} /><h2 className="text-xl">{slotLabel[slot]} pairing</h2></div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <p className={pts?.winner === 'home' ? 'font-bold text-lime' : ''}>{names(s.players, p.homePlayers)}</p>
                <p className="display text-2xl tabular-nums">{scoreText(p.result)}</p>
                <p className={`sm:text-right ${pts?.winner === 'away' ? 'font-bold text-lime' : ''}`}>{names(s.players, p.awayPlayers)}</p>
              </div>
              {pts && <p className="mt-1 text-sm text-bone/70">League points: {pts.home} – {pts.away}</p>}
              {p.live && !p.result && <p className="mt-1 text-sm text-red-300">Live: set {p.live.setNo}, games {p.live.gamesH}–{p.live.gamesA}</p>}
            </section>
          );
        })}
      </div>
      {f.correctedAt && <p className="text-sm text-amber-300">Corrected result · {new Date(f.correctedAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>}
    </div>
  );
}
