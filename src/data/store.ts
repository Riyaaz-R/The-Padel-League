import type { Division, PairingResult, PairingSlot, Penalty, Side } from '@/domain/types';
import type { Slot } from '@/domain/knockout';

/** In-memory shape of the season, loaded from Supabase per request (see db.ts). */
export type FixtureStatus = 'scheduled' | 'live' | 'awaiting_confirmation' | 'final' | 'disputed';
export interface LiveState { setNo: 1 | 2 | 3; gamesH: number; gamesA: number; tiebreak?: boolean; serving?: Side; updatedAt: string }
export interface PairingState { homePlayers: string[]; awayPlayers: string[]; result?: PairingResult; live?: LiveState }
export interface FixtureState {
  id: string; round: 'group' | 'qf' | 'sf' | 'final' | 'third' | 'plate_sf' | 'plate_final' | 'plate_third';
  slot?: Slot; week: number; group?: 'A' | 'B'; home: string; away: string; date: string; time?: string; court?: string;
  status: FixtureStatus; pairings: Record<PairingSlot, PairingState>; decidingWinner?: Side; version: number;
  correctedAt?: string;
}
export interface TeamRow { id: string; uuid: string; name: string; short: string; logo: string; colour?: string; group?: 'A' | 'B' }
export interface PlayerRow { id: string; name: string; teamId: string; division: Division; photoUrl?: string }
export interface AppState {
  seasonId: string;
  fixtures: FixtureState[]; players: PlayerRow[]; teams: TeamRow[]; penalties: Penalty[]; manualOrder: { A?: string[]; B?: string[] };
  announcement?: string; tvScene?: string;
  /** team slug <-> uuid maps for writes */
  teamUuid: Record<string, string>; groupUuid: Record<string, string>;
}
export const SLOTS: PairingSlot[] = ['ladies', 'low', 'high_1', 'high_2'];
export const emptyPairings = (): Record<PairingSlot, PairingState> =>
  ({ ladies: { homePlayers: [], awayPlayers: [] }, low: { homePlayers: [], awayPlayers: [] }, high_1: { homePlayers: [], awayPlayers: [] }, high_2: { homePlayers: [], awayPlayers: [] } });
