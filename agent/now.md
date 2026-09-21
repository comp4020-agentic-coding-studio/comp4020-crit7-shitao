# now

**First run for crit-7, 165h to cutoff.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Per the week/reading rule this is the opening of the 168h window --- not the
final run, so no `PROCESS.md` rewrite, no `reflections/crit-7.md`, no
finishing-steps push-and-confirm. Those stay for whichever run is told it's
last.

## What this run built

Picked the ANU system: group-study-room booking, framed around a real
failure mode (the library's own booking page doesn't show anyone else's
booking until you reload, so two groups collide on the same room). Built on
the starter's existing Astro+Drizzle+SQLite+SSE scaffold rather than going
off-piste, since that plumbing already fits the "live cross-tab update"
half of the idea.

- `src/lib/schema.ts`: replaced the starter's `messages` table with
  `rooms`/`bookings`, with a `unique(room_id, date, slot)` constraint --- the
  one property worth enforcing at the DB layer, not just hoped for in the UI.
- `src/lib/db.ts`: idempotent room seeding, `listRooms`/`listBookings`,
  `createBooking` catching `SQLITE_CONSTRAINT_UNIQUE` specifically (not the
  FK-violation code too --- caught and fixed that conflation myself before
  it shipped, since a bad `roomId` isn't the same failure as a real clash).
- `src/pages/api/bookings.ts` (renamed from `messages.ts`) + `events.ts`:
  POST validates and redirects with `?error=missing`/`?error=taken`, else
  emits a named `booking` SSE event.
- `src/pages/index.astro`: rooms x hourly-slot grid, per-cell mini-forms,
  `EventSource` subscription flips a cell to booked live in every open tab.
- `spec/booking.test.ts` (replaces the deleted `guestbook.test.ts`): drives
  the built server over HTTP --- persists across reload, refuses a clashing
  second booking while the first stands, broadcasts over SSE within 10s.
- Wrote `CLAUDE.md` (arrives empty per doctrine --- these are rules I set:
  schema.ts as ground truth with the migration committed alongside,
  double-booking prevention must be DB-level, always browser-verify at both
  marking viewports, commit small) and `README.md` (real annoyance, what's
  enforced vs. left to crit judgement, explicit out-of-scope: date picker,
  cancellation, accounts).

Verified with a full real-browser pass (booking flow, error banner, live
cross-tab update via two named `agent-browser` sessions, 390x844 mobile
viewport, console-error checks) --- caught and fixed two real CSS bugs
invisible to any automated check: no gap between nav links, and per-cell
name labels overflowing into neighbouring table cells (fixed with a proper
`.sr-only` class, not `display:none`, to keep the accessible name).
`pnpm check`: 0 errors/warnings/hints. All 28 tests green.

Committed in five scoped commits (db/schema, api routes, pages/styles, spec
test, docs) rather than one --- `c955886` through `5ab1072`. Deployed to
Fly.io (`flyctl deploy --remote-only --ha=false -a comp4020-crit7-shitao`,
first deploy for this app, so it created the machine and volume). Verified
the *live* URL per doctrine step 6, not just the local build: real browser
open of `https://comp4020-crit7-shitao.fly.dev/`, a real booking submitted
through the live UI, reloaded, still shows "Booked --- Shitao live-verify"
--- confirms the SQLite volume actually persists writes in production, not
just in the test harness.

## Next action

This is not the finishing run, so the next run should **deepen**, not
finish: candidates the README already names as out-of-scope on purpose ---
a date picker (more than today), cancellation, or a lightweight identity
so "booked by" can't be spoofed by anyone typing any name. Also worth a
periodic re-check at a viewport *between* the two marking sizes (e.g.
1280x720) and a resize-sequence check, per the standing "declared marking
viewports are necessary but not sufficient" lesson from prior deliverables
--- this run only checked 1920x1080/390x844 fixed, never a resize sequence,
on a page with a wide table that's plausibly resize-sensitive.

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits above), write `reflections/crit-7.md` (source `title`,
not a week number), re-run `pnpm check:evidence` (currently fails on both,
correctly, since neither exists yet), then push and redeploy/confirm.
