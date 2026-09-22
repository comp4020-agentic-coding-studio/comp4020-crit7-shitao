# now

**Sixth run for crit-7, 124h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run did

**Deployed for the first time since run 2.** `flyctl status` showed the live
app pinned at version 2 (2026-09-21), four runs' worth of real features
behind (owner-token cancellation, the two-week date window, `/mine/`, the
in-place Move feature) --- a prior run's `now.md` had conflated "push is
gated to inside 24h" with "deploy is gated too," but the doctrine's step 7 is
separate from the finishing-steps push gate: `flyctl deploy` doesn't touch
GitHub or need the repo public, so there's no reason to withhold it. Redeployed
twice this run (once at the start to catch up on runs 3--5, once at the end
after this run's own commits) --- confirmed live both times via `curl` against
the real `*.fly.dev` URL, not just `flyctl status`.

**Found and fixed a real mobile-layout bug during the verification pass**
(`f7d7efe`): `.mine-list li` is a flex container, and the booking's `<a>`
(date) and the trailing descriptive text were separate flex items --- on a
390px viewport they wrapped onto separate lines, orphaning a leading comma
before the slot ("2026-09-23" / ", 13:00, Hancock GSR 1 --- booked by ..."
on the next line). Fixed by wrapping both in one `<span>`, so it's a single
flex item that wraps at a normal word boundary instead. Caught by a real
`agent-browser` pass at 390×844, not by any of the 50 (then 53) green tests
--- same standing lesson as every prior "content-complete isn't sufficient"
entry in `MEMORY.md`, reconfirmed on this repo's fifth or sixth distinct bug
of that shape.

**Built the cross-window name search** (`2444e1f`, `45a9328`, `e90cdaa`,
`6bb06fb`), the deepening candidate the last hand-off named: `/mine/` only
shows your own bookings and the grid only shows one date, so neither answers
"is Priya's meeting still at 2pm Thursday." `/search/` is a plain GET over
`?q=` (no side effect to protect, so a normal bookmarkable URL, same shape as
the grid's `?date=` links), backed by `searchBookings(query, fromDate)` in
`db.ts` (SQLite `LIKE` is case-insensitive for ASCII by default, no `lower()`
needed). Deliberately refuses an empty query rather than listing everything
--- without that guard the page would double as a public directory of every
name and schedule in the system, which nothing else here does. Three spec
tests (`spec/search.test.ts`, using date+8/slot 10:00 and 11:00 --- grepped
every other spec file's hardcoded date/slot combinations first, per the
standing collision gotcha): case-insensitive partial match works, no-match
shows the right message, blank query shows nothing. Four small commits (lib,
pages+nav, spec, docs), each isolated and verified green via `git stash push
--keep-index -u` before the next, same pattern as run 5. 53/53 green.

Verified with a real-browser pass in a named session (`crit7run6`,
`crit7run6b` --- confirmed `location.href`/`window.innerWidth` before
trusting anything, per the standing shared-session and viewport gotchas):
booked, moved, and searched for a booking end to end at both 1920×1080 and
390×844, no console errors either time. Dev server torn down and port
confirmed free (`lsof -ti:$PORT`, not `pkill`) after each pass.

## Next action

Still not the finishing run. What's left from the original scope list:

- **Real accounts** remain the one named gap --- explicitly out of scope,
  per the "no login, a typed name not an account" framing.
- No other feature candidates currently queued. A future run could either
  find a new deepening angle (re-read the brief and the app fresh, or try
  a cold-read pass over `README.md`/`CLAUDE.md`/the app itself for drift,
  per the standing "content-complete isn't evidence" and "cold cross-
  reference read" techniques in `MEMORY.md`) or spend a run purely on a
  finishing-run checklist dry-run if nothing else surfaces.
- Nothing currently known broken. Deploy state: live app matches this run's
  final commit (`6bb06fb`), confirmed via `curl` against
  `https://comp4020-crit7-shitao.fly.dev/`.
- **Reminder for whoever deploys next**: deploying (unlike pushing) isn't
  gated to inside 24h --- do it whenever the live app has drifted meaningfully
  behind local commits, not just on the finishing run. Check `flyctl status
  -a comp4020-crit7-shitao` early in a run to see how stale the live version
  actually is, rather than trusting the last `now.md`'s account of it.

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all six runs), write `reflections/crit-7.md`
(source `title`, "Build the ANU system you wish existed," not a week
number), re-run `pnpm check:evidence`, then push and redeploy/confirm
against the live URL.
