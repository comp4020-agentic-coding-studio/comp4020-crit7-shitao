# now

**Seventh run for crit-7, 117h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run did

**Found and fixed a real asymmetric-validation bug** (`c176080`): both
`/api/bookings` and `/api/bookings/[id]/move` validated `slot` against the
fixed `SLOTS` enum (their own comments explicitly reasoned about "nothing
stops a hand-built request sending anything else") but never applied the
same check to `roomId` --- confirmed via `curl` against a scratch build
that a bogus `roomId` reached the database's own foreign-key constraint
unvalidated and surfaced as a raw 500, not the same friendly
`?error=missing` redirect every other bad field already gets. (Confirmed
along the way that this version of `better-sqlite3`, 13.0.3, enforces
`PRAGMA foreign_keys` on by default --- so the FK constraint was real, just
uncaught.) Fixed by checking `roomId` against `listRooms()` in both routes,
same shape as the existing slot-enum check. Two new spec tests (one per
route) assert the friendly redirect, not a 500. 55/55 green. Verified twice:
once via raw `curl` against a scratch-database build before AND after the
fix (500 → 303 `?error=missing`), once via the full `pnpm check` suite.

**Real-browser verification pass** at both marking viewports (1920×1080,
390×844, named session `crit7run7`, confirmed `window.innerWidth`/`href`
before trusting anything per the standing viewport gotchas): grid, `/mine/`,
and `/search/` all render cleanly with a real booking in the list at mobile
width (the exact shape that broke in run 6 --- confirmed still fixed, no
orphaned comma). No console errors anywhere. Preview server torn down and
port confirmed free via `lsof` after.

**Deployed** (`flyctl deploy --remote-only --ha=false -a comp4020-crit7-shitao`):
live app was pinned at version 4 (run 6's final commit) at the start of this
run; redeployed after this run's fix and confirmed via `curl` against the
real `*.fly.dev` URL that the roomId fix is live (bogus roomId now returns
303 `?error=missing`, not a 500).

## Next action

Still not the finishing run. What's left from the original scope list:

- **Real accounts** remain the one named gap --- explicitly out of scope,
  per the "no login, a typed name not an account" framing.
- No other feature candidates currently queued after a full read of every
  lib/page/API file this run (didn't find a second bug of this shape ---
  `bookedBy`, `date`, and `slot` are all validated everywhere they're used;
  `roomId` was the one asymmetry). A future run could re-read fresh, or
  spend a run on the finishing-run checklist dry-run if nothing else
  surfaces.
- Nothing currently known broken. Deploy state: live app matches this run's
  final commit (`c176080`), confirmed via `curl` against
  `https://comp4020-crit7-shitao.fly.dev/`.

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all seven runs), write `reflections/crit-7.md`
(source `title`, "Build the ANU system you wish existed," not a week
number), re-run `pnpm check:evidence`, then push and redeploy/confirm
against the live URL.
