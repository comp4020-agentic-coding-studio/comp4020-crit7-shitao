# now

**Fifteenth run for crit-7, 52h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still well
inside the 168h window --- not the finishing run, so no `PROCESS.md` rewrite,
no `reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 66/66 green, working tree clean, local `main` at
`15be951`, already in sync with `origin/main` (the harness's tick-snapshot had
already pushed it). Re-fetched the brief; unchanged since run 14.

This was a pure verification run --- **no code changes, nothing to commit.**
Picked up run 14's least-recently-tried angles:

1. **Genuine concurrent-write contention**, not just close-in-wall-clock-time
   contention: 20 truly parallel backgrounded `curl` POSTs (`&` + `wait`, not
   a sequential loop) at the exact same room/date/slot, against an isolated
   scratch server/DB. Exactly one row won; the other 19 hit the unique
   constraint. Stronger evidence than run 14's sequential-ish 30-trial script
   --- this is actual OS-level parallel process contention, and the DB-level
   guarantee held.
2. **Fresh mechanism read of `owner.ts`/`events.ts`** (run 14's suggested
   least-recently-tried file pair) --- both are tiny and read clean. Grepped
   every `bus.emit`/`bus.on` pair: `events.ts` subscribes to both `booking`
   and `cancelled`, matching every emit site in `bookings.ts`/`move.ts`/
   `cancel.ts`. No drift.
3. **README-vs-code drift check**: read `README.md` in full and cross-checked
   every specific claim (unique constraint shape, owner-token cancel gate,
   two-week window, `/mine/` cross-date listing, Move-as-one-UPDATE, Search's
   GET/non-empty-query/LIKE-escaping) against the actual current source. All
   still accurate --- no drift since it was last touched.
4. **Real browser pass**, isolated scratch server + named `agent-browser`
   sessions (`crit7-run15`, `crit7-tab2`), both marking viewports
   (1920x1080, 390x844): grid, `/mine/`, `/search/`, `/readme/` all render
   clean, no console errors. Drove an actual booking through the real form
   (name fill + direct form `requestSubmit()` on the correct cell, after the
   multi-match `find role button --name "Book"` hazard picked the wrong one
   of 32 identically-named buttons and tripped native HTML5 validation on an
   empty sibling field --- harmless, not a bug, just confirms accessible-name
   collisions among same-labelled buttons need a scoped selector, not a
   flagged `find`). Confirmed the Cancel button appears after redirect
   (owner-token cookie match), `/mine/` and `/search/` both show the new
   booking correctly.
5. **Cross-tab SSE re-confirmed** with two independently-named sessions: booked
   from tab one via direct form submission, tab two's still-open grid flipped
   the cell live with no reload and no console error.
6. **Fly deploy check**: `flyctl status` showed the machine `stopped` (normal
   idle state, not staleness --- see standing memory note) at image version
   matching run 14's deploy, which is exactly local `main`'s current commit
   since nothing changed this run. `curl` woke it, confirmed 200. Nothing to
   redeploy.

All scratch state (`/tmp/crit7-scratch/`) and both browser sessions cleaned
up; scratch server's port confirmed free after teardown.

## Next action

- Local `main` (`15be951`) and `origin/main` are already in sync --- no
  push needed, nothing pending.
- Live Fly app already caught up (deployed at run 14, unchanged since).
- This run's own verification pass came back clean across concurrent-write
  contention, pub/sub coverage, README-vs-code drift, and a full browser
  pass at both viewports plus cross-tab SSE --- a real "nothing to fix"
  result, not a skipped check. Per standing memory doctrine ("content-
  complete... is not sufficient evidence" / "two clean passes in a row is
  not evidence the well is dry"), a future non-finishing run should still
  try a **new** cold-read framing rather than assume this repo is done ---
  candidates not yet tried on crit-7 specifically: reading `spec/*.test.ts`
  themselves for contract-vs-implementation drift (the repo's own CLAUDE.md
  names this risk explicitly); or a genuine multi-writer *Move* contention
  test (two different bookings racing to move into the same destination
  slot simultaneously, not just two fresh creates).
- Whichever run is told it's the last one: write `PROCESS.md` for real (cite
  real commits across all fifteen runs --- `837a441` layout fix, `b93b144`
  privacy fix, `c176080` FK-validation fix, `22bb0f8` route-coverage fix,
  `825b475`/`5318284` redirect-date fixes, `3189940` error-attribution fix,
  `baee21b` cookie-model explainer are the concrete "corrected the work"
  examples so far), write `reflections/crit-7.md` (source `title`, "Build
  the ANU system you wish existed," not a week number), re-run
  `pnpm check:evidence`, push, and redeploy/confirm against the live URL if
  local `main` has moved past what's currently deployed.
