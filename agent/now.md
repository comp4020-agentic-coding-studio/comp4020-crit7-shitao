# now

**Ninth run for crit-7, 100h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run did

**Found and fixed a real privacy bug** (`b93b144`): `searchBookings`'s
empty-query guard ("an empty search would turn this into a public directory
of every name in the system," per its own comment) didn't stop a query of
just `%` or `_` from doing exactly that --- SQL LIKE treats those as
wildcards, not literal text, so `like(bookings.bookedBy, "%" + query + "%")`
with `query = "%"` becomes the pattern `%%%`, which matches every row
regardless of name. Verified live against a scratch server (booked "Alice
Wonderland", searched `%`/`_`, got her back both times) before touching code
--- not just reasoned about it. Fixed by escaping `\`, `%`, `_` in the query
and adding an explicit `ESCAPE '\'` clause via a raw `sql` template (drizzle's
`like()` helper has no escape option), and added a regression test
(`spec/search.test.ts`) alongside the existing blank-query test. All 64 tests
green (63 before, the new one is the 64th). This is a new *bug shape* worth
generalising: an "empty input" guard on a search/filter feature doesn't
imply the underlying query language's own wildcard/metacharacter set is also
neutralised --- check both, not just the empty-string case, for anything
built on LIKE/regex/glob-style matching. Worth adding to `MEMORY.md` proper
next run if this pattern recurs elsewhere.

**Deployed the fix** (`flyctl deploy --remote-only --ha=false`) since it's a
real runtime-behaviour change, not a test-only commit like run 8's --- per
doctrine step 7, deploying isn't gated to the finishing run. Confirmed live:
`curl` a bare `%` against the deployed `/search/` returns "No upcoming
bookings match" instead of leaking a booking. Made one real test booking on
the *live* app to prove this (couldn't verify the live deploy any other
way), then cancelled it via its owner cookie afterward so no junk booking is
sitting on the live app for the crit session --- confirmed gone via
`/mine/` with that same cookie before moving on.

**Real-browser pass** on `/search/` at both marking viewports (1920×1080,
390×844), named session `crit7run9`: made a real booking through the UI
(`find role textbox fill --name ... ` then `find role button click --name
"Book"`), confirmed the wildcard guard visually, screenshotted both
viewports (clean, no orphaned text, no console errors), closed the session,
killed the scratch server, verified the port was free after.

## Next action

- **Real accounts** remain the one named out-of-scope gap (README says so
  explicitly).
- This run's bug was found by re-reading `src/lib/db.ts` fresh rather than
  trusting "already re-read in run 7 with nothing found" --- worth another
  fresh full-source pass next run rather than assuming the well is dry after
  one clean run. Try a framing not yet used on this repo (per the
  assignment-2 "vary the framing" lesson): e.g. read every route's
  input-validation asymmetry as a *class* (the roomId-vs-slot gap from run 7
  and this run's query-vs-wildcard gap are the same shape --- some input is
  checked against an enum/guard, an adjacent one isn't) rather than
  stumbling on instances one at a time.
- Nothing else currently known broken. Live app confirmed serving this run's
  fix via a redeploy; the commit itself stays local-only (`git push` is a
  finishing step, gated to inside 24h of cutoff, and Fly deploy doesn't need
  a public repo or a push --- deploy and push are separate steps, per the
  standing MEMORY.md note on this).

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all nine runs, including this run's `b93b144`
privacy fix as a concrete "corrected the work" example), write
`reflections/crit-7.md` (source `title`, "Build the ANU system you wish
existed," not a week number), re-run `pnpm check:evidence`, then push and
redeploy/confirm against the live URL.
