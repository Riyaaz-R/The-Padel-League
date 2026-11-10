import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui';
import { COMMITTEE, SEASON } from '@/data/seed';
import { fmtRand } from '@/lib/format';

export const metadata: Metadata = { title: 'About' };

export default function About() {
  return (
    <div className="space-y-8">
      <PageTitle>About the league</PageTitle>
      <section className="card"><h2 className="text-2xl">Venue</h2><p>{SEASON.venue}. The league is run by PadelBros (Instagram @padelbros_sa). Court numbers and start times are published by the committee before each Friday.</p></section>
      <section className="card"><h2 className="text-2xl">Money</h2><ul className="list-disc pl-5"><li>Team entry: {fmtRand(SEASON.entryFee)}</li><li>Team ownership: {fmtRand(SEASON.ownershipFee)} (includes entry fee and captain selection)</li><li>Prize: {fmtRand(SEASON.finalPrize)} to the team that wins the Final</li></ul></section>
      <section className="card"><h2 className="text-2xl">Committee</h2>
        <p>Chairman: <strong>{COMMITTEE.chairman}</strong> · Treasurer: <strong>{COMMITTEE.treasurer}</strong></p>
        <p className="mt-1">Committee: {COMMITTEE.committee.join(', ')}</p><p>Members: {COMMITTEE.members.join(', ')}</p>
        <p className="mt-2 text-sm text-bone/60">Contact numbers and the WhatsApp link are to be confirmed by the committee.</p></section>
      <section className="card"><h2 className="text-2xl">Disputes &amp; corrections</h2><p>Score disputes must be raised in writing to the committee within 24 hours of the match. Contact your captain, who liaises with the committee.</p></section>
    </div>
  );
}
