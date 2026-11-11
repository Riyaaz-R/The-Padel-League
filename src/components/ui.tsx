import Image from 'next/image';
import Link from 'next/link';
import type { Division } from '@/domain/types';
import { teamOf } from '@/data/team-store';
import { divisionLabel } from '@/lib/format';

export const team = (id: string) => teamOf(id);

/** Every logo sits in the same dark rounded tile so mixed backgrounds look uniform. */
export function TeamBadge({ id, size = 48 }: { id: string; size?: number }) {
  const t = team(id);
  return (
    <span className="inline-block shrink-0 overflow-hidden rounded-xl border border-line bg-card" style={{ width: size, height: size }}>
      <Image src={t.logo} alt={`${t.name} logo`} width={size * 2} height={size * 2} className="h-full w-full object-contain" />
    </span>
  );
}

export function TeamLink({ id, size = 36 }: { id: string; size?: number }) {
  return (
    <Link href={`/teams/${id}`} className="inline-flex items-center gap-2 hover:text-lime">
      <TeamBadge id={id} size={size} /><span className="font-semibold">{team(id).name}</span>
    </Link>
  );
}

const DIV_STYLE: Record<Division, string> = { ladies: 'bg-ladies', high: 'bg-high', low: 'bg-low' };
/** Colour plus text label, so colour is never the only signal. */
export function DivisionTag({ d }: { d: Division }) {
  return <span className={`tag ${DIV_STYLE[d]}`}>{divisionLabel[d]}</span>;
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <header className="mb-6">
      <h1 className="slashes text-4xl sm:text-5xl">{children}</h1>
      {sub && <p className="mt-1 text-bone/70">{sub}</p>}
    </header>
  );
}

export function StatusTag({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    scheduled: ['Scheduled', 'bg-line text-bone'], live: ['Live', 'bg-red-500 text-white'],
    awaiting_confirmation: ['Awaiting confirmation', 'bg-amber-400 text-ink'], final: ['Completed', 'bg-lime text-ink'], disputed: ['Disputed', 'bg-red-700 text-white'],
  };
  const [label, cls] = map[status] ?? [status, 'bg-line'];
  return <span className={`tag ${cls}`}>{status === 'live' && <span className="live-dot mr-1">●</span>}{label}</span>;
}
