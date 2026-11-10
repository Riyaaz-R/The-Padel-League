import type { Table } from '@/domain/standings';
import { TeamLink } from './ui';

export function TableView({ table, group, compact = false }: { table: Table; group: string; compact?: boolean }) {
  return (
    <section className="card overflow-x-auto" aria-label={`Group ${group} table`}>
      <h2 className="mb-3 text-2xl">Group {group}</h2>
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-bone/60">
            <th className="py-1 pr-2">Pos</th><th>Team</th><th className="text-center">P</th>
            {!compact && <th className="text-center">Pairings W–L</th>}
            <th className="text-center">Sets</th>{!compact && <th className="text-center">Games</th>}
            <th className="text-center">Pts</th><th className="text-center">Form</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.teamId} className={`border-t border-line ${r.pos <= 4 ? '' : ''}`}>
              <td className="py-2 pr-2 font-bold">{r.pos}</td>
              <td>
                <TeamLink id={r.teamId} size={32} />
                {r.note && <div className={`ml-10 text-xs ${r.committeeFlag ? 'text-amber-300' : 'text-bone/60'}`}>{r.note}</div>}
              </td>
              <td className="text-center tabular-nums">{r.played}</td>
              {!compact && <td className="text-center tabular-nums">{r.pairingsW}–{r.pairingsL}</td>}
              <td className="text-center tabular-nums">{r.setsW}/{r.setsL} ({r.setsW - r.setsL >= 0 ? '+' : ''}{r.setsW - r.setsL})</td>
              {!compact && <td className="text-center tabular-nums">{r.gamesW}/{r.gamesL} ({r.gamesW - r.gamesL >= 0 ? '+' : ''}{r.gamesW - r.gamesL})</td>}
              <td className="text-center text-lg font-extrabold text-lime tabular-nums">
                {r.points - r.penalty}{r.penalty > 0 && <span className="block text-xs font-normal text-red-300">−{r.penalty} penalty</span>}
              </td>
              <td className="text-center">{r.form.map((x, i) => <span key={i} className={`mx-0.5 inline-block w-5 rounded text-xs font-bold text-ink ${x === 'W' ? 'bg-lime' : x === 'L' ? 'bg-red-400' : 'bg-bone/60'}`}>{x}</span>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {table.committeeRequired && <p className="mt-2 text-sm text-amber-300">Committee decision required to separate tied teams.</p>}
      <p className="mt-2 text-xs text-bone/50">Order: points, sets difference, games difference, head-to-head, then committee decision. Only verified results count.</p>
    </section>
  );
}
