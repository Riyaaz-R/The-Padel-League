import Image from 'next/image';
import Link from 'next/link';
import { DivisionTag, team } from '@/components/ui';
import { loadState } from '@/data/db';
import { loadPeople, type PersonRow } from '@/data/people';
import { requireStaffPage } from '@/lib/auth';
import { fmtRand } from '@/lib/format';
import { normalizeName } from '@/domain/names';
import { PeopleNav } from './PeopleNav';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = { registered: 'Registered', approved: 'Approved', in_auction: 'In auction', sold: 'Sold', unsold: 'Unsold', withdrawn: 'Withdrawn', replaced: 'Replaced' };

function Avatar({ p }: { p: PersonRow }) {
  return p.photoUrl
    ? <Image src={p.photoUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full border border-line object-cover" />
    : <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-ink text-sm font-bold text-bone/70">{(p.first[0] ?? '?').toUpperCase()}{(p.surname[0] ?? '').toUpperCase()}</span>;
}
const flags = (p: PersonRow) => [p.injured && 'Injured', p.suspendedUntil && `Suspended to ${p.suspendedUntil}`, p.isMinor && 'Under 18', !p.surname && !p.corrected && 'Single name'].filter(Boolean) as string[];

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; team?: string; level?: string; status?: string; ok?: string; error?: string }> }) {
  const { q = '', team: teamF = '', level = '', status = '', ok, error } = await searchParams;
  const { db } = await requireStaffPage('committee');
  const s = await loadState();
  const all = await loadPeople(db, s.seasonId, s.teams);
  const nq = normalizeName(q);
  const list = all.filter((p) =>
    (!nq || normalizeName(p.name).includes(nq) || normalizeName(`${p.first}${p.surname}`).includes(nq)) &&
    (!teamF || (teamF === 'none' ? !p.teamSlug : p.teamSlug === teamF)) && (!level || p.division === level) && (!status || p.status === status));

  return (
    <div>
      <h1 className="mb-1 text-3xl">Players &amp; Teams</h1>
      <p className="mb-4 text-sm text-bone/70">Changes show on the public pages straight away. {all.length} players in this season.</p>
      <PeopleNav active="players" />
      {ok && <p role="status" className="card mb-4 border-lime text-lime">{ok}</p>}
      {error && <p role="alert" className="card mb-4 border-red-400 text-red-200">{error}</p>}

      <form method="get" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm lg:col-span-2">Search name<input name="q" defaultValue={q} className="input mt-1" placeholder="First name or surname" /></label>
        <label className="text-sm">Team<select name="team" defaultValue={teamF} className="input mt-1"><option value="">All teams</option><option value="none">No team</option>{s.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="text-sm">Level<select name="level" defaultValue={level} className="input mt-1"><option value="">All levels</option><option value="ladies">Ladies</option><option value="high">High</option><option value="low">Low</option></select></label>
        <label className="text-sm">Status<select name="status" defaultValue={status} className="input mt-1"><option value="">Any status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button className="btn">Apply filters</button>{(q || teamF || level || status) && <Link href="/admin/people" className="btn-ghost">Clear</Link>}<span className="ml-auto self-center text-sm text-bone/70">{list.length} shown</span></div>
      </form>

      {/* phones: cards */}
      <ul className="space-y-2 md:hidden">
        {list.map((p) => (
          <li key={p.id} className="card flex items-center gap-3">
            <Avatar p={p} />
            <div className="min-w-0 grow">
              <p className="truncate font-semibold">{p.first}{p.surname && ` ${p.surname}`}</p>
              <p className="truncate text-sm text-bone/70">{p.teamSlug ? team(p.teamSlug).name : 'No team'} · {STATUS_LABEL[p.status] ?? p.status}{p.price !== null && ` · ${fmtRand(p.price)}`}</p>
              {flags(p).length > 0 && <p className="text-xs text-amber-300">{flags(p).join(' · ')}</p>}
            </div>
            <div className="flex flex-col items-end gap-2"><DivisionTag d={p.division} /><Link href={`/admin/people/${p.id}`} className="btn-ghost !min-h-[40px] !px-3 text-sm" aria-label={`Edit ${p.name}`}>Edit</Link></div>
          </li>
        ))}
      </ul>

      {/* larger screens: table */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-bone/60"><th className="py-2">Player</th><th>First name</th><th>Surname</th><th>Level</th><th>Team</th><th>Status</th><th>Price</th><th>Contact</th><th /></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2"><Avatar p={p} /></td>
                <td className="font-semibold">{p.first}</td><td>{p.surname || <span className="text-bone/40">–</span>}</td>
                <td><DivisionTag d={p.division} /></td><td>{p.teamSlug ? team(p.teamSlug).name : <span className="text-bone/50">No team</span>}</td>
                <td>{STATUS_LABEL[p.status] ?? p.status}{flags(p).length > 0 && <span className="block text-xs text-amber-300">{flags(p).join(' · ')}</span>}</td>
                <td>{p.price !== null ? fmtRand(p.price) : <span className="text-bone/40">–</span>}</td>
                <td className="text-xs text-bone/70">{p.phone || p.email ? [p.phone && 'phone', p.email && 'email'].filter(Boolean).join(' + ') : <span className="text-bone/40">none</span>}</td>
                <td className="text-right"><Link href={`/admin/people/${p.id}`} className="btn-ghost !min-h-[36px] !px-3" aria-label={`Edit ${p.name}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && <p className="card mt-3 text-bone/70">No players match these filters.</p>}
    </div>
  );
}
