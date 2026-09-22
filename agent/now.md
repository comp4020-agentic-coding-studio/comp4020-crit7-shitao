# now

**Fourth run for crit-7, 141h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run built

Added a "My bookings" view (`/mine/`): the grid only ever renders one date,
so finding a booking made a few days ago meant clicking through the date
picker one day at a time. `/mine/` reads the same owner-token cookie the
cancel button already trusts, across the whole two-week window instead of
one date, sorted oldest-first.

- `src/lib/db.ts`: `listBookingsByOwner(token, fromDate)` --- no schema
  change, reuses the existing `owner_token` column.
- `src/pages/mine.astro`: new page, listing every booking that cookie holds
  from today onward, each with a link back to its own date on the grid and
  a cancel button.
- `src/pages/api/bookings/[id]/cancel.ts`: cancelling now accepts an
  optional `returnTo` form field, checked against an explicit whitelist
  (`/` or `/mine/`) rather than trusted raw --- so it can't become an open
  redirect. The grid's own cancel forms never send it, so they default to
  `/` exactly as before.
- Nav links added to `index.astro` and `readme.astro`; `spec/routes.ts` now
  covers `/mine/` too, so the standing a11y/invariants suite checks it like
  every other page.
- `spec/mine.test.ts`: four new tests --- lists across two dates sorted
  correctly, doesn't leak another browser's bookings, cancelling from
  `/mine/` returns to `/mine/` and frees the slot on the grid, cancelling
  without `returnTo` still defaults to the grid. 46/46 green.
- `README.md`: describes the view and the returnTo whitelist.

Four scoped commits (`fa3ff7c` through `149855c`) --- lib, pages (incl. the
cancel-route change and nav links, which are all one coherent slice), spec,
docs --- each verified buildable/green via `git stash push --keep-index`
before moving to the next.

One real bug caught mid-build, not by any check: `spec/mine.test.ts`'s first
draft booked slot `13:00` on today's date, which silently collided with
`spec/booking.test.ts`'s `guardedSlot` (also `13:00` today, same room --- both
files resolve the same room via the same "first 09:00 cell" lookup). The
`createBooking` failure was silent because `ownerToken(cookies)` mints a
cookie *before* the create is attempted, so the losing test's `ownerCookie()`
call still succeeded even though no booking existed under it. Fixed by
picking `16:00` (unused by any other spec file's today-dated booking) rather
than adding cross-file coordination machinery.

Verified with a real-browser pass (`agent-browser`, session
`crit7-shitao-verify`, confirmed via `eval "location.href"` before trusting
any of it): booked today and a future date under one cookie, `/mine/` listed
both correctly sorted at both 1920x1080 and 390x844, cancelling from `/mine/`
returned to `/mine/` (not `/`) and freed the slot on the grid (checked via a
plain `curl` of the built HTML), empty state renders cleanly. No console
errors. Server shut down and port confirmed free before finishing.

## Next action

Still not the finishing run. What's left from the original scope list:

- **Real accounts** remain the one named gap --- explicitly out of scope,
  per the "no login, a typed name not an account" framing.
- Candidates for a future deepening pass: editing a booking in place
  (currently cancel-and-rebook only); a simple name/room search across the
  window (partially subsumed by `/mine/` for your *own* bookings, but not
  for finding someone else's); or spending a future run purely on the
  finishing-run checklist dry-run if nothing else surfaces.
- Nothing currently known broken. Deploy state: still whatever run 2 last
  pushed live --- this run committed locally only, per doctrine (finishing
  steps including push/deploy are gated inside 24h to cutoff).

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all four runs), write `reflections/crit-7.md`
(source `title`, not a week number), re-run `pnpm check:evidence`, then push
and redeploy/confirm against the live URL.
