export type Division = 'ladies' | 'high' | 'low';
export type PairingSlot = 'ladies' | 'high_1' | 'high_2' | 'low';
export type Side = 'home' | 'away';

export interface TbScore { h: number; a: number }
/** One set. `forced` marks a recorded forfeit set (e.g. 6-0 late, 6-X injury) that skips normal validity. */
export interface SetScore { h: number; a: number; tb?: TbScore; forced?: boolean }
export interface PairingResult {
  set1: SetScore;
  set2: SetScore;
  /** 10-point match tie-break, only when sets are 1-1 */
  mtb?: TbScore;
  outcome?: 'normal' | 'forfeit_set' | 'forfeit_match' | 'walkover' | 'retired';
}
export interface PairingPoints { home: number; away: number; winner: Side }

export interface PairingRecord { slot: PairingSlot; result?: PairingResult }
export interface FixtureRecord {
  id: string;
  home: string;
  away: string;
  pairings: PairingRecord[];
  /** deciding set winner (knockouts only) */
  decidingWinner?: Side;
}
export interface Penalty { teamId: string; points: number; reason: string }
