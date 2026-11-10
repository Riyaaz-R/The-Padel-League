import type { Metadata } from 'next';
import { LiveBoard } from '@/components/LiveBoard';
import { PageTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Live scores' };

export default function Live() {
  return (
    <div>
      <PageTitle sub="Updates automatically every few seconds. No refresh needed.">Live scores</PageTitle>
      <LiveBoard />
      <p className="mt-6 text-sm text-bone/60">YouTube stream: the stream link is added here by the committee when a broadcast is scheduled.</p>
    </div>
  );
}
