import type { PairingResult, SetScore } from '@/domain/types';

const set = (s: SetScore) => `${s.h}-${s.a}${s.tb ? `(${Math.min(s.tb.h, s.tb.a)})` : ''}`;
export function scoreText(r?: PairingResult): string {
  if (!r) return '–';
  const base = `${set(r.set1)}  ${set(r.set2)}`;
  const tail = r.mtb ? `  [${r.mtb.h}-${r.mtb.a}]` : '';
  const flag = r.outcome && r.outcome !== 'normal' ? ` (${r.outcome.replace('_', ' ')})` : '';
  return base + tail + flag;
}
