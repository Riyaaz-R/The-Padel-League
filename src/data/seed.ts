import type { Division } from '@/domain/types';

export interface Team { id: string; name: string; short: string; group: 'A' | 'B'; logo: string; owner?: string; captain?: string }
export interface Player { id: string; name: string; teamId: string; division: Division; nameIncomplete: boolean }
export interface FixtureSeed { id: string; week: number; round: 'group'; group: 'A' | 'B'; home: string; away: string; date: string }

export const SEASON = {
  name: 'Season 1', number: 1, venue: 'TPC – The Padel Centre', tz: 'Africa/Johannesburg',
  entryFee: 8000, ownershipFee: 10000,
  /** The league prize pot. Change it here and it updates everywhere. */
  prizePot: 20000,
  weeks: [
    { week: 1, date: '2026-11-13', label: 'Group round 1' }, { week: 2, date: '2026-11-20', label: 'Group round 2' },
    { week: 3, date: '2026-11-27', label: 'Group round 3' }, { week: 4, date: '2026-12-04', label: 'Quarter-finals' },
    { week: 5, date: '2026-12-11', label: 'Semi-finals' }, { week: 6, date: '2026-12-18', label: 'Finals, 3rd/4th, Plate' },
  ],
} as const;

export const TEAMS: Team[] = [
  { id: 'tpc-titans', name: 'TPC Titans', short: 'TIT', group: 'A', logo: '/logos/tpc-titans.webp' },
  { id: 'gq-warriors', name: 'GQ Warriors', short: 'GQW', group: 'A', logo: '/logos/gq-warriors.webp' },
  { id: 'the-crusaders', name: 'The Crusaders', short: 'CRU', group: 'A', logo: '/logos/the-crusaders.webp' },
  { id: 'gq-mavericks', name: 'GQ Mavericks', short: 'GQM', group: 'A', logo: '/logos/gq-mavericks.webp' },
  { id: 'tdd-tigers', name: 'TDD Tigers', short: 'TDD', group: 'B', logo: '/logos/tdd-tigers.webp' },
  { id: 'eastcape-knights', name: 'Eastcape Knights', short: 'EKN', group: 'B', logo: '/logos/eastcape-knights.webp' },
  { id: 'tpc-spartans', name: 'TPC Spartans', short: 'SPA', group: 'B', logo: '/logos/tpc-spartans.webp' },
  { id: 'apex', name: 'Apex', short: 'APX', group: 'B', logo: '/logos/apex.webp' },
];

type Roster = { ladies: string[]; high: string[]; low: string[] };
// Transcribed from the roster poster. Single names are shown exactly as given.
const ROSTERS: Record<string, Roster> = {
  'tdd-tigers': { ladies: ['Freda Geldenhuys', 'Melane Hall', 'Shafeeqah Smith'], high: ['Johan Grobelaar', 'Karlo', 'Darryl Halgreen', 'Laeeq Amien', 'Stefan Geldenhuys'], low: ['Aboe Bakr Abrahams', 'Amier Moosagie', 'Logan Geldenhuys'] },
  'eastcape-knights': { ladies: ['Fatimun', 'Tahierah Abrahams'], high: ['Laeeq Salie', 'Keanu Gelderbloem', 'Nic Kruger', 'Akief Salie', 'AJ Issacs', 'Sadique Patel', 'Haanim'], low: ['Waqaar Kader', 'Chad Allison', 'Matthew Randall'] },
  'tpc-spartans': { ladies: ['Keisha Arnolds', 'Carla'], high: ['Anthony Nel', 'Saaid Nordien', 'Zaki', 'Luke Baynes', 'Khaleel Panday', 'Tawfeeq Loonat'], low: ['Ejaaz Kader', 'Sohail Nair', 'Muhammed Rawat'] },
  'tpc-titans': { ladies: ['Shannon Smith', 'Ammaarah Lombard', 'Sumayya Ally'], high: ['Mika Wynford', 'Saood Nordien', 'Zain Gaffore', 'Ulrich', "Mo Sa'ad Patel"], low: ['Uzair Ackerdien', 'Nadir Ackerdien', 'Sternie Van Staden', 'Ubaidullah Panday'] },
  apex: { ladies: ['Noeleen', 'Soraya Khan', 'Chloe Nordien'], high: ['Roy Thomas', 'Mo Connely', 'Justin Anderson', 'Taaha Panday', 'Siraaj Mallick', 'Raees Khan'], low: ['Ayaan Ackerdien', 'Nithaam Fakier', 'Yahya Norshiep'] },
  'gq-mavericks': { ladies: ['Caileigh Goddard', 'Dilshaad Ahmed', 'Nabeelah Pandie'], high: ['Greg Butters', 'Oskar Wolff', 'Rushi', 'Monre', 'Zimmo'], low: ['Sameer Gani', 'Laeeq Loonat', 'Razeen Davids', 'Muneer Gaida'] },
  'the-crusaders': { ladies: ['Rush', 'Nabeelah Nordien', 'Dilshaad Govender'], high: ['Connor De Lange', 'Heston Baartman', 'Clyde White', 'Raaiq Nordien', "Sham'oon", 'Ryan Fritz', 'Ryan De Beer'], low: ['Bevan Blignaut', 'Mickey Brass', 'Uthmaan Jassen'] },
  'gq-warriors': { ladies: ['Marine', 'Monsi Pla Blu', 'Merika Miles'], high: ['Pieter Mienie', 'Zaheed Munshie', 'Talieb Haroun', 'Michael Anderson', 'Luqmaan Laher', 'Zubair Lorgat'], low: ['Lyall Meyer', 'Bilaal Munshie', 'Zaheer Munshie'] },
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const PLAYERS: Player[] = Object.entries(ROSTERS).flatMap(([teamId, r]) =>
  (['ladies', 'high', 'low'] as Division[]).flatMap((division) =>
    r[division].map((name) => ({ id: `${teamId}--${slug(name)}`, name, teamId, division, nameIncomplete: !name.includes(' ') })),
  ),
);

const g = (id: string, week: number, group: 'A' | 'B', home: string, away: string): FixtureSeed =>
  ({ id, week, round: 'group', group, home, away, date: SEASON.weeks[week - 1].date });

export const GROUP_FIXTURES: FixtureSeed[] = [
  g('g1a1', 1, 'A', 'tpc-titans', 'gq-warriors'), g('g1a2', 1, 'A', 'the-crusaders', 'gq-mavericks'),
  g('g1b1', 1, 'B', 'tdd-tigers', 'eastcape-knights'), g('g1b2', 1, 'B', 'tpc-spartans', 'apex'),
  g('g2a1', 2, 'A', 'tpc-titans', 'the-crusaders'), g('g2a2', 2, 'A', 'gq-warriors', 'gq-mavericks'),
  g('g2b1', 2, 'B', 'tdd-tigers', 'tpc-spartans'), g('g2b2', 2, 'B', 'eastcape-knights', 'apex'),
  g('g3a1', 3, 'A', 'tpc-titans', 'gq-mavericks'), g('g3a2', 3, 'A', 'gq-warriors', 'the-crusaders'),
  g('g3b1', 3, 'B', 'tdd-tigers', 'apex'), g('g3b2', 3, 'B', 'eastcape-knights', 'tpc-spartans'),
];

export const COMMITTEE = {
  chairman: 'Enver Amien', treasurer: 'Muneer Gaida',
  committee: ['Enver Amien', 'Luqmaan Ajam', 'Siraaj Mallick'],
  members: ['Luqmaan Ajam', 'Siraaj Mallick', 'Muneer Gaida', 'Tawfeeq Loonat', 'Laeeq Loonat'],
};

export const teamById = (id: string) => TEAMS.find((t) => t.id === id)!;

/** Seed self-check (used by tests and the seed script): 4 High / 2 Ladies / 2 Low minimum, no player on two teams. */
export function checkSeed(): string[] {
  const errors: string[] = [];
  for (const t of TEAMS) {
    const ps = PLAYERS.filter((p) => p.teamId === t.id);
    const c = (d: Division) => ps.filter((p) => p.division === d).length;
    if (c('high') < 4 || c('ladies') < 2 || c('low') < 2) errors.push(`${t.name} is below the 4/2/2 minimum`);
  }
  const seen = new Map<string, string>();
  for (const p of PLAYERS) {
    const k = p.name.toLowerCase();
    if (seen.has(k) && seen.get(k) !== p.teamId) errors.push(`${p.name} appears on two teams`);
    seen.set(k, p.teamId);
  }
  return errors;
}
