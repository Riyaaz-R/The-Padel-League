'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSnapshot } from '@/lib/use-snapshot';
import { FixtureLive, activeFixtures } from './LiveBoard';
import { Marquee } from './Marquee';
import type { Snapshot, SnapTableRow } from '@/lib/snapshot';

const SCENES = ['live', 'standings', 'next', 'results', 'bracket'] as const;
type Scene = (typeof SCENES)[number];

function Standings({ s }: { s: Snapshot }) {
  const T = ({ rows, g }: { rows: SnapTableRow[]; g: string }) => (
    <div className="card"><h2 className="mb-[1vh] text-[4vh]">Group {g}</h2>
      {rows.map((r) => (
        <div key={r.teamId} className="grid grid-cols-[3vh_6vh_1fr_auto_auto] items-center gap-[1.5vh] border-t border-line py-[1vh] text-[3vh]">
          <span className="font-bold">{r.pos}</span><Image src={r.logo} alt="" width={64} height={64} className="h-[6vh] w-[6vh] rounded-lg" />
          <span className="display">{r.name}</span><span className="text-bone/60">P{r.played}</span><span className="display text-[4vh] text-lime tabular-nums">{r.points}</span>
        </div>
      ))}</div>
  );
  return <div className="grid h-full grid-cols-2 gap-[3vh]"><T rows={s.tables.A} g="A" /><T rows={s.tables.B} g="B" /></div>;
}

function Bracket({ s }: { s: Snapshot }) {
  const label = (slot: string) => ({ FINAL: 'Final', THIRD: '3rd/4th', PFINAL: 'Plate Final', PTHIRD: 'Plate 3rd/4th' } as Record<string, string>)[slot] ?? slot;
  return (
    <div className="grid h-full grid-cols-4 gap-[2vh] text-[2.4vh]">
      {s.bracket.map((b) => (
        <div key={b.slot} className="card"><p className="text-[2vh] text-lime">{label(b.slot)}</p>
          <p>{b.home ? s.teams[b.home].name : b.homeLabel}</p><p>{b.away ? s.teams[b.away].name : b.awayLabel}</p></div>
      ))}
    </div>
  );
}

export function TvScreen({ fixedScene, scale }: { fixedScene?: string; scale?: number }) {
  const { snap, online } = useSnapshot(3000);
  const [i, setI] = useState(0);
  const [fs, setFs] = useState(false);
  useEffect(() => { if (fixedScene) return; const t = setInterval(() => setI((x) => (x + 1) % SCENES.length), 15000); return () => clearInterval(t); }, [fixedScene]);
  useEffect(() => { // keep the screen awake; re-acquire after tab visibility changes
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { lock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { /* unsupported */ } };
    get(); const v = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', v);
    const reload = setTimeout(() => location.reload(), 6 * 3600_000); // periodic reload picks up new deployments
    return () => { document.removeEventListener('visibilitychange', v); clearTimeout(reload); lock?.release().catch(() => {}); };
  }, []);

  if (!snap) return <div className="tv-root flex items-center justify-center text-[4vh]">Loading…</div>;
  const forced = (fixedScene ?? snap.tvScene) as Scene | undefined;
  const scene: Scene = forced && SCENES.includes(forced) ? forced : SCENES[i];
  const list = activeFixtures(snap);
  const results = snap.fixtures.filter((f) => f.status === 'final').slice(-6).reverse();
  const next = snap.fixtures.filter((f) => f.status === 'scheduled').slice(0, 4);

  return (
    <div className="tv-root" style={scale ? { fontSize: `${scale}vh` } : undefined}
      onClick={() => { if (!fs) { document.documentElement.requestFullscreen?.().catch(() => {}); setFs(true); } }}>
      <div className="tv-drift flex h-full flex-col">
        <header className="mb-[2vh] flex items-center justify-between">
          <div className="flex items-center gap-[2vh]"><Image src="/logos/league-badge.webp" alt="" width={90} height={90} className="h-[8vh] w-[8vh] rounded-full" />
            <h1 className="text-[5vh]">The Padel <span className="text-lime">League</span></h1></div>
          <div className="text-right text-[2.2vh] text-bone/70"><p>TPC Friday Night League · Powered by PadelBros</p>
            <p className={online ? 'text-lime' : 'text-amber-300'}>{online ? '● LIVE DATA' : '● reconnecting… showing last known scores'}</p></div>
        </header>
        <div className="min-h-0 flex-1">
          {scene === 'live' && <div className={`grid h-full gap-[2vh] ${list.length > 2 ? 'grid-cols-2' : 'grid-cols-1'} content-start`}>{list.slice(0, 4).map((f) => <FixtureLive key={f.id} f={f} big />)}</div>}
          {scene === 'standings' && <Standings s={snap} />}
          {scene === 'next' && <div className="grid grid-cols-2 gap-[2vh]">{next.length ? next.map((f) => <FixtureLive key={f.id} f={f} big />) : <p className="text-[4vh]">All fixtures this round are complete.</p>}</div>}
          {scene === 'results' && <div className="grid grid-cols-2 gap-[2vh]">{results.length ? results.map((f) => <FixtureLive key={f.id} f={f} big />) : <p className="text-[4vh]">No results yet.</p>}</div>}
          {scene === 'bracket' && <Bracket s={snap} />}
        </div>
        {snap.announcement && <Marquee text={snap.announcement} className="mt-[1.5vh] rounded-xl bg-lime py-[1vh] text-[3vh] font-bold uppercase tracking-wide text-ink" />}
      </div>
    </div>
  );
}
