export const RULES_VERSION = { version: 1, effective: '13 Nov 2026' };

/** From the official Rules & Regulations PDF (plus the league owner's confirmed clarifications, marked). */
export const RULES: { id: string; title: string; items: string[] }[] = [
  { id: 'structure', title: '1. Competition structure', items: [
    'Each team has a minimum of 8 players: 4 High Intermediate, 2 Ladies and 2 Youth/Beginner–Low Intermediate players.',
    'The league runs over 6 weeks with 8 teams, randomly divided into 2 groups.',
    'Weeks 1–3: group round robin. Each team plays the 3 other teams in its group once.',
    'Week 4: quarter-finals. Week 5: semi-finals. Week 6: Final, 3rd/4th place, Plate Final, Plate 3rd/4th.',
  ] },
  { id: 'registration', title: '2. Registration, captains & auction', items: [
    'Entry fee: R8 000 per team (R600–R800 per player).',
    'Team ownership: R10 000 per team (includes the team entry fee and captain selection).',
    'Prize: R20 000 to the team that wins the Final.',
    'Captains are selected through a random live draw. Teams are assembled by captains through a player auction.',
    'Only registered players assigned to their team may participate in the league.',
    'All teams must keep the required player-category composition; category eligibility is determined by the committee.',
    'If a team member cannot continue because of injury (unforeseen circumstances), a remaining player from the auction list can replace them, subject to committee approval. The replaced player leaves the team, cannot play future matches, and is removed from the auction list and cannot be re-selected. This is not available on match days.',
    'Players may not represent two different teams in the same league.',
    'There is no limit on players per team; all players must be purchased within the allocated budget.',
    'Team ownership can be acquired before the captains’ auction; the owner then selects a captain from the player pool. The remaining teams follow the captain selection process.',
    'Captain: leads the team, submits pairings on time, raises disputes or concerns with the committee, and collects and handles team payments. Captains liaise directly with the committee.',
    'Owner (if a team is purchased): responsible for their team and allocates the captain’s responsibilities. Owners may liaise directly with the committee, limited to decisions within their own team(s).',
  ] },
  { id: 'pairings', title: '3. Team fixtures & pairings', items: [
    'Each team fixture has one Ladies pairing, one Youth/Beginner–Low Intermediate pairing and two High Intermediate pairings.',
    'Captains submit pairings by the deadline announced before each Friday. Once submitted, no changes except for an injury.',
    'A coin toss, if used, decides which captain chooses the order of the High pairings. Ladies and Youth/Low remain category-restricted.',
    'Start times and courts are published separately. Players must be courtside 10 minutes before their scheduled start.',
    'Players may play up (Youth/Low may play in a High game) but may not play down (High may not play in a Youth/Low game).',
    'Only ladies may play in the Ladies pairing. (Confirmed by the league owner: ladies play only in the Ladies pairing, with and against ladies, and never in High or Low pairings.)',
    'A player may play only ONE game per game-week.',
  ] },
  { id: 'scoring', title: '4. Match scoring', items: [
    'Matches are played over two full sets. If each side wins one set, a 10-point match tie-break (win by 2) decides the match.',
    'Each set is first to 6 games, win by 2. At 6–6 a 7-point tie-break (win by 2) is played.',
    'Silver-point scoring applies throughout.',
  ] },
  { id: 'points', title: '5. League points & group rankings', items: [
    'A 2–0 set win earns the winning pairing 4 league points; the losing pairing earns 0.',
    'At 1–1 in sets, the winner of the match tie-break earns 3 points and the loser 1.',
    'Points are added up across the team fixture (maximum 16) and across the group stage.',
    'Ranking tie-break order: total league points; sets won minus sets lost; games won minus games lost; head-to-head result; then committee determination.',
  ] },
  { id: 'knockout', title: '6. Knockouts & Plate', items: [
    'Quarter-finals: 1) Group A 1st v Group B 4th; 2) Group B 1st v Group A 4th; 3) Group A 2nd v Group B 3rd; 4) Group B 2nd v Group A 3rd.',
    'Semi-finals: winner QF1 v winner QF4; winner QF2 v winner QF3. Plate semi-finals follow the same order with the quarter-final losers.',
    'Semi-final winners go through to their respective finals; losers play the 3rd/4th placement matches.',
    'If an overall team fixture is tied, each captain nominates one eligible pairing for a deciding set to 6 games, with a 7-point tie-break at 6–6.',
  ] },
  { id: 'forfeits', title: '7. Late arrival, walkovers & forfeits', items: [
    'Players must be ready at the scheduled match start.',
    '15 minutes late: the first set is forfeited (recorded 6–0). 30 minutes or more late: the entire match is forfeited.',
    'A full-match forfeit is recorded 6–0, 6–0; the opposing pairing earns 4 points and the forfeiting pairing 0.',
    'Fixtures are published in good time so players can make arrangements.',
  ] },
  { id: 'replacements', title: '8. Replacements & injury', items: [
    'Before a match begins, an unavailable player may be replaced only by an eligible reserve, with committee approval.',
    'During a match, an injured player may be replaced by an eligible unused reserve from the same team. If no replacement is available within 5 minutes, the team forfeits the match.',
    'A replacement enters only at the start of the next set or the match tie-break. The interrupted set is recorded 6–X, where X is the injured pairing’s games won at that point.',
    'No other substitutions are permitted.',
  ] },
  { id: 'equipment', title: '9. Court and equipment', items: [
    'Wear suitable padel or court-sport shoes. Rackets must be appropriate for padel.',
    'Follow the venue’s safety and court-use rules.',
    'Warm-ups are limited to three minutes unless otherwise agreed. Leave the court promptly after your allocated time.',
    'Official match balls: Wilson Red.',
  ] },
  { id: 'conduct', title: '10. Scores, conduct & administration', items: [
    'Both teams must confirm the final score after each match.',
    'Scores must be submitted to the league official or designated platform immediately after the match.',
    'Score disputes must be raised in writing within 24 hours.',
    'Incorrectly reported results may be corrected by the league official after verification.',
    'Owners, players, captains and supporters must show respect and good sportsmanship. No abusive language, intimidation or unsportsmanlike conduct.',
    'Players must make honest line calls and resolve disagreements respectfully. If a dispute cannot be resolved, replay the point where appropriate or refer it to the committee or the dedicated official for that fixture.',
    'The Committee may issue warnings, point penalties, match forfeitures or suspensions for abusive language, intimidation, unsportsmanlike behaviour, deliberate cheating or repeated misconduct.',
    'The committee has the final say on league-specific disputes, interprets the rules and decides matters not expressly covered. Decisions are final, subject to any appeal submitted in writing.',
  ] },
];
