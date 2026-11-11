'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSnapshot } from '@/lib/use-snapshot';
import { FixtureLive, activeFixtures } from './LiveBoard';
import { LuckyDrawBar } from './LuckyDrawBar';
import { Marquee } from './Marquee';
import type { Snapshot, SnapTableRow } from '@/lib/snapshot';

const SCENES = ['live', 'standings', 'next', 'results', 'bracket'] as const;
type Scene = (typeof SCENES)[number];
// "Back" keys on remotes: Escape/Backspace (browsers), 10009 (Samsung Tizen), 461 (LG webOS)
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);
const BACK_CODES = new Set([27, 8, 10009, 461]);

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

/**
 * Full-screen TV view. Shows live scores (default) with the Lucky Draw bar along the bottom.
 * Controls (Full screen / Exit) appear on any key, tap or mouse move, then hide again. Back keys on a TV remote exit to the website.
 */
export function TvScreen({ fixedScene, scale }: { fixedScene?: string; scale?: number }) {
  const router = useRouter();
  const { snap, online } = useSnapshot(3000);
  const [i, setI] = useState(0);
  const [page, setPage] = useState(0); // pages of 4 matches when more are on court at once
  const [controls, setControls] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode = fixedScene ?? snap?.tvScene ?? undefined;
  const rotating = mode === 'rotate' || mode === 'auto';

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.push('/');
  }, [router]);
  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => { const t = setInterval(() => setPage((p) => p + 1), 12000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!rotating) return;
    const t = setInterval(() => setI((x) => (x + 1) % SCENES.length), 15000);
    return () => clearInterval(t);
  }, [rotating]);

  useEffect(() => { // show controls on any input, hide after 7s of quiet
    const reveal = () => { setControls(true); if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setControls(false), 7000); };
    const onKey = (e: KeyboardEvent) => {
      if (BACK_KEYS.has(e.key) || BACK_CODES.has(e.keyCode)) { const t = e.target as HTMLElement | null; if (t?.tagName !== 'INPUT') { e.preventDefault(); exit(); return; } }
      reveal();
    };
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    reveal();
    window.addEventListener('keydown', onKey); window.addEventListener('mousemove', reveal); window.addEventListener('pointerdown', reveal); window.addEventListener('touchstart', reveal);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey); window.removeEventListener('mousemove', reveal); window.removeEventListener('pointerdown', reveal); window.removeEventListener('touchstart', reveal);
      document.removeEventListener('fullscreenchange', onFs); if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [exit]);

  useEffect(() => { // keep the screen awake; re-acquire after tab visibility changes
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { lock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { /* unsupported */ } };
    get(); const v = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', v);
    const reload = setTimeout(() => location.reload(), 6 * 3600_000); // periodic reload picks up new deployments
    return () => { document.removeEventListener('visibilitychange', v); clearTimeout(reload); lock?.release().catch(() => {}); };
  }, []);

  const [canFs, setCanFs] = useState(false); // decided after load so server and browser render the same HTML
  useEffect(() => setCanFs(Boolean(document.documentElement.requestFullscreen)), []);
  const controlBar = (
    <div className={`fixed right-[2vh] top-[2vh] z-[210] flex gap-[1.5vh] transition-opacity ${controls ? 'opacity-100' : 'pointer-events-none opacity-0'}`} role="toolbar" aria-label="TV controls">
      {canFs && <button type="button" onClick={toggleFs} className="btn-ghost bg-ink/80 !text-[2.4vh]" tabIndex={controls ? 0 : -1}>{isFs ? 'Exit full screen' : 'Full screen'}</button>}
      <button type="button" onClick={exit} className="btn !text-[2.4vh]" tabIndex={controls ? 0 : -1} autoFocus>Exit to website</button>
    </div>
  );

  if (!snap) return <div className="tv-root flex items-center justify-center text-[4vh]">Loading…{controlBar}</div>;
  const scene: Scene = rotating ? SCENES[i] : SCENES.includes(mode as Scene) ? (mode as Scene) : 'live';
  const list = activeFixtures(snap);
  const pages = Math.max(1, Math.ceil(list.length / 4));
  const pageNo = page % pages;
  const shown = list.slice(pageNo * 4, pageNo * 4 + 4);
  const results = snap.fixtures.filter((f) => f.status === 'final').slice(-6).reverse();
  const next = snap.fixtures.filter((f) => f.status === 'scheduled').slice(0, 4);

  return (
    <div className="tv-root" style={scale ? { fontSize: `${scale}vh` } : undefined}>
      {controlBar}
      <div className="tv-drift flex h-full flex-col">
        <header className="mb-[1vh] flex items-center justify-between">
          <div className="flex items-center gap-[2vh]"><Image src="/logos/league-badge.webp" alt="" width={90} height={90} className="h-[6vh] w-[6vh] rounded-full" />
            <h1 className="text-[4vh]">The Padel <span className="text-lime">League</span></h1></div>
          <div className="text-right text-[2.2vh] text-bone/70"><p>TPC Friday Night League · Powered by PadelBros</p>
            <p className={online ? 'text-lime' : 'text-amber-300'}>{online ? '● LIVE SCORES' : '● reconnecting… showing last known scores'}{scene === 'live' && pages > 1 ? `  ·  page ${pageNo + 1} of ${pages}` : ''}</p></div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          {scene === 'live' && <div className={`grid h-full gap-[1vh] ${shown.length > 2 ? 'grid-cols-2' : 'grid-cols-1'} content-start`}>{shown.map((f) => <FixtureLive key={f.id} f={f} big />)}</div>}
          {scene === 'standings' && <Standings s={snap} />}
          {scene === 'next' && <div className="grid grid-cols-2 gap-[2vh]">{next.length ? next.map((f) => <FixtureLive key={f.id} f={f} big />) : <p className="text-[4vh]">All fixtures this round are complete.</p>}</div>}
          {scene === 'results' && <div className="grid grid-cols-2 gap-[2vh]">{results.length ? results.map((f) => <FixtureLive key={f.id} f={f} big />) : <p className="text-[4vh]">No results yet.</p>}</div>}
          {scene === 'bracket' && <Bracket s={snap} />}
        </div>
        {snap.announcement && <Marquee text={snap.announcement} className="mt-[1vh] rounded-xl bg-lime py-[0.5vh] text-[2.4vh] font-bold uppercase tracking-wide text-ink" />}
        <LuckyDrawBar today={snap.today} winners={snap.winners} />
      </div>
    </div>
  );
}
