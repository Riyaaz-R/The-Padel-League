/**
 * TPC Café Lucky Draw, transcribed from the official poster ("TPC Cafe Lucky Draw A2 Poster Size.pdf").
 * Nothing here is invented: prizes, entry bands and rules are exactly as printed.
 */
export const LUCKY_DRAW = {
  title: 'TPC Café Lucky Draw',
  tagline: '6 weeks, 6 prizes, 1 epic grand prize!',
  runs: 'During the TPC Padel League, 13 Nov to 18 Dec',
  prizes: [
    { week: 1, prize: '2x TPC Spartans supporters tees' },
    { week: 2, prize: '2x Puma caps' },
    { week: 3, prize: 'TPC Café voucher' },
    { week: 4, prize: 'Playtopia voucher' },
    { week: 5, prize: 'Free padel coaching session' },
    { week: 6, prize: 'Grand prize: Adidas limited edition Metalbone Pro-EDT padel racket', grand: true },
  ],
  entries: [
    { spend: 'R100 – R149', entries: 1 },
    { spend: 'R150 – R199', entries: 2 },
    { spend: 'R200 – R249', entries: 3 },
    { spend: 'R250 – R299', entries: 4 },
    { spend: 'R300 +', entries: 5 },
  ],
  rules: [
    'Competition runs for the full six weeks of the TPC Padel League.',
    'Only purchases from TPC Padel Café qualify.',
    'Entries are based on the total qualifying transaction value.',
    'One weekly winner will be drawn for the advertised weekly prize.',
    'Winning entries are returned to the draw box and remain eligible for subsequent draws.',
    'All entries accumulated during the six weeks qualify for the grand prize draw.',
    'Winners must be present when drawn or another winner will be selected.',
    "TPC management's decision is final.",
  ],
} as const;
