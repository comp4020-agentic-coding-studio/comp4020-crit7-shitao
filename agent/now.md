# now

**Third run for crit-7, 148h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run built

Closed the last declared gap from run 2's README (a date picker), leaving
"real accounts" as the one remaining out-of-scope item. The schema already
stored `date` per booking, so this was a UI + validation change, no
migration.

- `src/lib/slots.ts`: `BOOKING_WINDOW_DAYS = 13` (a two-week look-ahead from
  today, inclusive), `addDays` (UTC-based so DST can't shift the calendar
  date), and `isBookableDate` --- the single gate both the page and the API
  check a date against, so they can't disagree about what's in range. ISO
  date strings compare correctly as plain strings, so no Date-object
  arithmetic needed for the range check itself.
- `src/pages/api/bookings.ts`: rejects a date outside the window with a new
  `?error=date` redirect, same shape as the existing slot-enum check.
- `src/pages/index.astro`: reads `?date=`, falls back to today if missing/
  malformed/out-of-range (never errors on a bad URL), renders prev/next nav
  links disabled at each end of the window. The SSE handlers already
  filtered on the viewed `date` variable --- no change needed there, it just
  started meaning "the viewed date" instead of always today.
- `spec/booking.test.ts`: three new tests (future date within window books
  and shows only on its own date's page; a date past the window is refused
  by the API; a malformed `?date=` falls back to rendering today). 34/34
  green.
- `README.md`: describes the window and why it's bounded (two weeks, not an
  open calendar) rather than left as a named gap.

Five scoped commits (`017f17a` through `c692c39`) --- lib, api, pages, spec,
docs --- each verified buildable and green via `git stash push --keep-index`
before moving to the next, same pattern as run 2.

Verified with a real-browser pass (`agent-browser`, session
`crit7-shitao-verify`): booked a slot today, confirmed the nav's next-day
link showed the slot free on that date (cross-date isolation), confirmed the
window boundary is exactly today+13 (next arrow disables there, `?date=`
30 days out both clamps the page to today and gets `?error=date` from a
direct `curl` POST), confirmed the `error=date` banner renders, and checked
390x844 --- error-free console, nav wraps cleanly, cancel button still shows
for the owning cookie. Cleaned up the test booking, killed the dev server,
confirmed the port was free before finishing.

## Next action

Still not the finishing run. What's left from the original scope list:

- **Real accounts** are the one remaining named gap --- explicitly a much
  bigger lift than this repo's "no login, a typed name not an account"
  framing wants; probably stays a gap through to the end rather than
  something a future run closes.
- Other candidates for a future deepening pass, if accounts stay out of
  scope: editing a booking (currently cancel-and-rebook only) is more
  useful now that a date picker makes "wrong date" a realistic mistake; a
  simple search/filter by name across the two-week window; or leaving the
  feature set as-is and spending a future run purely on the finishing-run
  checklist dry-run (nothing wrong found this run, `pnpm check` clean,
  34/34 tests).
- Nothing currently known broken. Deploy state: still whatever run 2 last
  pushed live (`flyctl deploy` not re-run this run since nothing was pushed
  --- per doctrine, finishing steps including push/deploy are gated inside
  24h to cutoff, and this run committed locally only, same as run 2 did for
  its own work).

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all three runs), write `reflections/crit-7.md`
(source `title`, not a week number), re-run `pnpm check:evidence`, then push
and redeploy/confirm against the live URL.
