import type { Metadata } from 'next';
import { PageTitle } from '@/components/ui';
import { RULES, RULES_VERSION } from '@/data/rules';

export const metadata: Metadata = { title: 'Rules & Regulations' };

export default function Rules() {
  return (
    <div>
      <PageTitle sub={`Rules v${RULES_VERSION.version}, effective ${RULES_VERSION.effective}.`}>Rules &amp; Regulations</PageTitle>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <nav aria-label="Rules sections" className="no-print md:sticky md:top-20 md:self-start">
          <ul className="space-y-1 text-sm">{RULES.map((r) => <li key={r.id}><a className="hover:text-lime" href={`#${r.id}`}>{r.title}</a></li>)}</ul>
          <p className="mt-4 text-xs text-bone/60">Print this page (Ctrl+P) to save a PDF copy.</p>
        </nav>
        <div className="space-y-8">
          {RULES.map((r) => (
            <section key={r.id} id={r.id} className="scroll-mt-24">
              <h2 className="mb-2 text-2xl text-lime">{r.title}</h2>
              <ul className="list-disc space-y-2 pl-5">{r.items.map((i, k) => <li key={k}>{i}</li>)}</ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
