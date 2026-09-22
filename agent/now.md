# now

**Fifth run for crit-7, 135h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

Brief's warning callout (update the `comp4020` plugin, two `claude plugin`
commands) doesn't apply to this environment: `claude plugin marketplace
list` returns "No marketplaces configured," so there's no comp4020 plugin
installed here to update. Not a gap in this run --- just not a thing this
session has.

## What this run built

Editing a booking in place from `/mine/` --- change room/date/slot without
cancel-and-rebook. Picked this over the other `now.md`-listed candidate
(cross-window name search for someone else's booking) because it's the one
with a real correctness story, not just convenience: cancel-then-rebook has
a genuine window where you've freed the old slot and the new one turns out
taken, so you lose the booking entirely. An in-place `UPDATE` is checked
against the same `(room_id, date, slot)` unique constraint on update as on
insert, so a failed move leaves the original booking untouched.

- `src/lib/db.ts`: `moveBooking(id, ownerToken, next)` --- selects the
  current row (ownership + existence check), then a single `UPDATE ... WHERE
  id = ? AND owner_token = ?`, catching `SQLITE_CONSTRAINT_UNIQUE` the same
  way `createBooking` already does. No schema change --- reuses existing
  columns.
- `src/pages/api/bookings/[id]/move.ts`: new route, same
  validation/ownership/whitelist shape as `cancel.ts`. On success emits the
  *existing* `"cancelled"` event (old snapshot) then `"booking"` event (new
  snapshot) over the SSE bus --- deliberately reusing the two event types
  every open tab already listens for, rather than inventing a third
  "moved" event and a new client-side handler for it.
- `src/pages/mine.astro`: each booking gets a `<details>`-collapsed "Move"
  form (room select, native `<input type=date>` bounded to the booking
  window, slot select), plus four new `?error=` messages
  (taken/missing/date/notfound) alongside the existing cancel one.
- `spec/move.test.ts`: four tests --- moves and frees the old cell/fills the
  new one; refuses a move into a slot someone else holds, leaving both
  bookings intact; refuses without the owner cookie; refuses a date outside
  the window. Used dates +5/+10 days out specifically because they're unused
  by any other spec file's hardcoded today/+3/+7 combinations (grepped
  first, per the standing collision gotcha in `MEMORY.md`). 50/50 green.
- `README.md`: describes the feature and the atomicity argument for it.

Four scoped commits (`c820b03` lib, `9f0c34a` pages+route, `235a418` spec,
`bcb49f8` docs), each verified buildable/green in true isolation via `git
stash push --keep-index -u` before moving to the next --- the `-u` mattered
this time: the first attempt without it left two new *untracked* files
(the route, the spec file) sitting in the tree while `mine.astro` got
stashed away, giving a misleading test failure that looked like a real bug.
Recorded as a refinement to the existing stash-isolation entry in
`MEMORY.md`.

Verified with a real-browser pass (`agent-browser`, session
`crit7-move-verify`, checked `location.href` and `window.innerWidth` before
trusting anything): booked 09:00 today via the real form, moved it to 11:00
from `/mine/`'s Move form, confirmed via `curl` of the built HTML that
09:00 is free again and 11:00 shows the booking, screenshotted `/mine/` and
the grid at both 1920x1080 and 390x844 (the Move form wraps cleanly on
mobile, no overflow), no console errors. Server shut down and port
confirmed free before finishing.

## Next action

Still not the finishing run. What's left from the original scope list:

- **Real accounts** remain the one named gap --- explicitly out of scope,
  per the "no login, a typed name not an account" framing.
- Candidates for a future deepening pass: a simple name/room search across
  the window for *someone else's* booking (not just your own, which `/mine/`
  already covers); or spending a future run purely on the finishing-run
  checklist dry-run if nothing else surfaces.
- Nothing currently known broken. Deploy state: still whatever run 2 last
  pushed live --- this run committed locally only, per doctrine (finishing
  steps including push/deploy are gated inside 24h to cutoff).

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all five runs), write `reflections/crit-7.md`
(source `title`, "Build the ANU system you wish existed", not a week
number), re-run `pnpm check:evidence`, then push and redeploy/confirm
against the live URL.
