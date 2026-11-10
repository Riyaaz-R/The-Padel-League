# The Padel League

League hub, live scores and TV mode for the TPC Friday Night Team Padel League (TPC – The Padel Centre, run by PadelBros).

## Status (what works today)

| Area | State |
|---|---|
| Rules engine (`src/domain`) | Done and tested: points, set/tie-break validation, forfeits/injury scores, pairing eligibility, standings with tie-breaks, knockout bracket + deciding set |
| Season 1 seed (`src/data/seed.ts`) | Done: 8 teams, 12 group fixtures, rosters, committee; self-check test |
| Public site | Home, Fixtures, Fixture detail, Tables, Knockouts, Teams, Players, Live, Rules, About |
| TV mode `/tv` | Scenes (live, standings, up next, results, bracket), no-scroll vh layout, wake lock, reconnect badge |
| Staff `/staff` → `/admin` | Supabase Auth email + password, mandatory TOTP, roles from `profiles`; score entry with validation (client and database), forfeit buttons, status lifecycle, corrections with reason, penalties, announcement banner, TV scene, audit log. Tested with a real Super Admin: sign-in + TOTP, score entry for all four pairings, double-booking refused, Final verification, corrections need a reason, quarter-finals auto-created, live scoring (see docs/STAFF.md). Not yet tested: forfeit buttons, deciding set, penalties, announcement, TV scene, scorer role |
| Database | Live on Supabase project `roqrejjlplrzwavvvmup` (eu-central-1, free). Schema, RLS, Season 1 seed. The whole site now reads from it. Database rules and anonymous-access limits tested |
| Realtime | Live page and TV subscribe to Supabase Realtime with polling fallback. Verified: live score changes reach an open /live page without refresh |
| Not built yet | Captain portal and pairing submission, score confirmation/dispute workflow, second-approver rule, offline queue, discipline UI, auction (Phase 5), share images, calendar, ledger, Vercel deploy |

## Run it

```bash
npm install
cp .env.example .env.local      # fill in the two Supabase values (see .env.example)
npm run dev                     # http://localhost:3000
npm test                        # rules engine + seed tests
npm run typecheck && npm run lint && npm run build
npm run assets                  # re-optimise logos from the parent folder into public/logos
```

Create the first Super Admin as described in docs/STAFF.md. Needs Node 22+ in production (Node 20 works locally through Next).

## Data

All data lives in Supabase. Public pages read with the public key (row-level security allows only published data). Staff writes run as the signed-in user, so no service-role key is used. Team names, logos and groups are still defined in `src/data/seed.ts` (Season 1); players, fixtures, results and penalties come from the database.

## TV setup (55" or smaller)

Open `https://<site>/tv` in the TV browser (or cast a laptop over HDMI) and tap once to go full screen. Options: `?scene=live|standings|next|results|bracket` locks a scene, `?scale=1.2` scales text, and setting `TV_TOKEN` in the environment requires `?token=...`. The page keeps the screen awake and reloads itself every 6 hours.

## Rules reference

`src/data/rules.ts` mirrors the official PDF. Ladies play only in the Ladies pairing (owner-confirmed); this is the default of `allowedDivisions()`.
