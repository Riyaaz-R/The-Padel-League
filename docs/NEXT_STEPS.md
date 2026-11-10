# Next steps and decisions

## Decisions made (best option chosen, change if you disagree)
- Single Next.js app, no monorepo. Pure rules engine in `src/domain`, no framework imports.
- Local JSON store first so the site runs before a Supabase project exists; schema is ready in `supabase/migrations`.
- Silver point: point-by-point scoring left OFF until you confirm the exact rule. Only game scores are recorded.
- Group tables flag "Committee decision required" only once a group has finished its round-robin.
- A match tie-break counts as a set for sets difference; it adds no games to the games difference. Confirm with the committee.
- Admin is a single committee passcode for now (12-hour cookie). Real accounts, roles and 2FA come with Supabase Auth.

## Needed from you
1. A Supabase project (free tier is fine for staging) and a Vercel account. Then I can apply migration 0001 and build the adapter.
2. Number of courts and Friday start times (enter on each fixture in `/admin` meanwhile).
3. Silver-point rule wording.
4. Team owners/captains, so team pages can show them.

## Remaining phases
- Phase 1b: Supabase adapter, Auth + TOTP, roles, RLS tests, Realtime replacing polling, deploy staging.
- Phase 3: captain portal (pairing submission and deadline lock), confirm/dispute workflow, second-approver conflict rule, offline queue.
- Phase 4: discipline UI, notifications.
- Phase 5: auction (registration, `place_bid()` engine, bidder room, auctioneer console, OBS overlays, load test).
- Phase 6: share images, calendar sync, ledger, PDFs, POPIA pages, accessibility/Lighthouse audit.
