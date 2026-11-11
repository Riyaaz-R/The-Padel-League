import { cache } from 'react';
import { TEAMS } from './seed';
import type { TeamRow } from './store';

/**
 * Teams for the current request. loadState() fills it, and components then call teamOf(id) synchronously.
 * Falls back to the Season 1 seed list if nothing has been loaded (so a page can never crash on a team lookup).
 */
const store = cache(() => ({ teams: new Map<string, TeamRow>() }));

export function registerTeams(teams: TeamRow[]) {
  const m = store().teams;
  m.clear();
  for (const t of teams) m.set(t.id, t);
}

export function teamOf(id: string): TeamRow {
  const hit = store().teams.get(id);
  if (hit) return hit;
  const seed = TEAMS.find((t) => t.id === id);
  return seed ? { id: seed.id, uuid: '', name: seed.name, short: seed.short, logo: seed.logo, group: seed.group } : { id, uuid: '', name: id, short: id.slice(0, 3).toUpperCase(), logo: '/logos/league-badge.webp' };
}
