# now

**Sixteenth run for crit-7, 45h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still well
inside the 168h window --- not the finishing run, so no `PROCESS.md` rewrite
(it's still the untouched template boilerplate, confirmed by `git log
--oneline -- PROCESS.md` showing only "Initial commit" --- that's expected,
per doctrine it's written for real on the last run, not before), no
`reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 66/66 green, working tree clean, local `main` at
`6b4cf3f`, already in sync with `origin/main`. Re-fetched the brief
(unchanged since run 14/15). Fly `flyctl status` showed the machine
`stopped` (normal idle) at the image matching run 14's deploy --- unchanged,
since no code has changed since then, so nothing to redeploy.

Picked up run 15's two suggested least-recently-tried angles, both came back
clean:

1. **Genuine multi-writer Move contention** (not just genuine concurrent
   *creates*, which run 15 already proved holds): two *different* existing
   bookings, each with their own owner-token cookie, racing to move into the
   *same* destination slot at the same instant. Built this properly on the
   second attempt --- the first attempt accidentally raced one booking
   against itself (moving A to a slot it was already sitting at trivially
   "succeeds" every round, since an UPDATE to a row's own current values
   doesn't trip the unique constraint against itself), which produced a
   deterministic, not-actually-racing result that would have been a false
   "confirmed" if taken at face value. Fixed by using 8 independent rounds,
   each with two brand-new bookings on their own date (so no round's state
   leaks into another) actually converging on a fresh destination slot
   neither started at. All 16 requests fired as genuine OS-level parallel
   backgrounded `curl`s across all 8 rounds at once. Result: exactly one
   winner and one `error=taken` loser per round, in every round, confirmed
   directly against the DB afterward --- no double booking at any
   destination slot, no lost booking (both rows always still present, one
   moved, one at its original slot). The DB-level unique constraint holds
   under genuine multi-writer Move contention, not just Create contention.
   Tooling note for next time: `mapfile` is a bash builtin, not available
   under zsh (`(eval): command not found: mapfile`) --- reading an array
   from a file for a loop like this needs an explicit `bash -c '...'`
   wrapper, not the default zsh shell this tool runs.

2. **Spec contract-vs-implementation drift review**, delegated to a
   general-purpose/sonnet subagent per the "reserve top model for
   subtle-debugging/adversarial-verification, sonnet for everything else"
   rule --- this was a cold structural read, not subtle debugging. Read all
   eight `spec/` files plus every route/lib file they exercise. Clean: every
   assertion targets status code, redirect `Location`, or rendered HTML ---
   nothing asserts on `db.ts`'s internal function shapes or a specific
   internal ordering that isn't part of the observable contract.
   `spec/routes.ts`'s four-route coverage list still matches all four actual
   `.astro` page files exactly; the four API routes are correctly handled by
   `booking.test.ts`/`mine.test.ts`/`move.test.ts` directly rather than the
   HTML-page invariants file, which is the right split, not a gap.

Both scratch DB and server torn down; port confirmed free after.

## Next action

- Nothing pending to push or redeploy --- local and `origin/main` already
  agree, Fly already caught up.
- Per standing doctrine ("two clean passes in a row is not evidence the well
  is dry"), a future non-finishing run should try a fresh angle rather than
  assume crit-7 is done. Candidates not yet tried on this repo specifically:
  a genuine multi-writer race on **cancel-vs-move** (one request cancelling
  a booking at the exact instant another request tries to move a *different*
  booking into that just-freed slot --- does the mover ever see a phantom
  "taken" for a slot that's actually free by the time its own request
  completes, or land cleanly); or reading `mine.astro`/`index.astro`'s
  actual template markup cold against every one of `booking.test.ts`'s and
  `mine.test.ts`'s regex-based DOM assertions specifically for *brittleness*
  (not correctness, which this run's spec-drift pass already covered) ---
  i.e. would a purely cosmetic, contract-preserving markup change (attribute
  order, added wrapper div) break a test that doesn't need to care.
- Whichever run is told it's the last one: write `PROCESS.md` for real (cite
  real commits across all sixteen runs --- `837a441` layout fix, `b93b144`
  privacy fix, `c176080` FK-validation fix, `22bb0f8` route-coverage fix,
  `825b475`/`5318284` redirect-date fixes, `3189940` error-attribution fix,
  `baee21b` cookie-model explainer are the concrete "corrected the work"
  examples so far), write `reflections/crit-7.md` (source `title`, "Build
  the ANU system you wish existed," not a week number), re-run
  `pnpm check:evidence`, push, and redeploy/confirm against the live URL if
  local `main` has moved past what's currently deployed.
