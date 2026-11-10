import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui';
import { TableView } from '@/components/TableView';
import { groupTables } from '@/data/derive';
import { loadState } from '@/data/db';

export const metadata: Metadata = { title: 'Tables' };
export const dynamic = 'force-dynamic';

export default async function Tables() {
  const t = groupTables(await loadState());
  return (
    <div>
      <PageTitle sub="Points are summed across all four pairings of each team fixture (max 16). Ties: sets difference, games difference, head-to-head, then committee.">Group tables</PageTitle>
      <div className="space-y-6"><TableView table={t.A} group="A" /><TableView table={t.B} group="B" /></div>
    </div>
  );
}
