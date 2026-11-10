'use client';
import { useEffect, useState } from 'react';
import { LUCKY_DRAW } from '@/data/luckydraw';
import { SEASON } from '@/data/seed';

/** Bottom bar for the TV screen: rotates through Lucky Draw messages (all taken from the poster) and the announced winners. */
export function LuckyDrawBar({ today, winners }: { today: string; winners: { week: number; name: string }[] }) {
  const started = today >= SEASON.weeks[0].date;
  const week = started ? [...SEASON.weeks].reverse().find((w) => w.date <= today)!.week : 1;
  const prize = LUCKY_DRAW.prizes.find((p) => p.week === week)!.prize;
  const messages = [
    'Spend R100+ at TPC Padel Café to enter. Spend more, get more entries!',
    started ? `Week ${week} prize: ${prize}` : `Starts Friday 13 Nov. Week 1 prize: ${prize}`,
    `Week 6 ${LUCKY_DRAW.prizes[5].prize.replace('Grand prize: ', 'grand prize: ')}. Every entry counts!`,
    LUCKY_DRAW.entries.map((e) => `${e.spend.replace(/ – /, '–')} = ${e.entries}`).join('  ·  '),
    ...winners.map((w) => `Week ${w.week} winner: ${w.name}`),
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => x + 1), 7000); return () => clearInterval(t); }, []);
  const msg = messages[i % messages.length];
  return (
    <div className="mt-[1.5vh] flex items-center gap-[2vh] rounded-xl border-2 border-lime bg-card px-[2vh] py-[0.9vh]" aria-label="TPC Café Lucky Draw">
      <span className="display shrink-0 rounded-lg bg-lime px-[1.4vh] py-[0.4vh] text-[2.6vh] text-ink">TPC Café Lucky Draw</span>
      <p key={i} className="fade-in min-w-0 flex-1 truncate text-[2.7vh] font-semibold">{msg}</p>
      <span className="hidden shrink-0 text-[1.8vh] text-bone/60 lg:block">Details: Lucky Draw tab on our website</span>
    </div>
  );
}
