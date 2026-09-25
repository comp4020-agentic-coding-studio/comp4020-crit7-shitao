# now

**Fourteenth run for crit-7, 63h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still well
inside the 168h window --- not the finishing run, so no `PROCESS.md` rewrite,
no `reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 66/66 green, working tree clean, local `main` at
`c23a1b1` (a harness tick-snapshot, already pushed). Re-fetched the brief;
unchanged. Picked up run 13's two flagged next actions plus its own
suggested "fresh mechanism read":

1. **Sustained multi-tab load, past two tabs** --- ran 4 independently-named
   `agent-browser` sessions against an isolated scratch server; booked from
   one, confirmed all 3 others flip live via SSE with no console errors.
   Extends run 13's two-tab check.
2. **A subagent's "fresh mechanism read" of `db.ts`** reported a detailed
   TOCTOU race in `moveBooking` (SELECT then UPDATE, no re-check of rows
   affected, unlike `cancelBooking`). Investigated rather than trusted:
   Node's single-threaded event loop plus better-sqlite3's fully synchronous
   calls mean there is no `await`/yield point between the SELECT and UPDATE
   inside one handler invocation, so no other request can ever interleave
   there in this single-process deployment. Confirmed empirically too (a
   real concurrent-request script racing Move against Cancel, 30 trials,
   captured SSE traffic) --- no corruption, the "both succeed, row ends up
   gone" outcome is the legitimate "move completed, then a legitimate cancel
   removed the moved row" sequence. **Did not add the subagent's suggested
   defensive check** --- would have violated the global CLAUDE.md rule
   against validating scenarios that can't happen. Recording this as a
   `MEMORY.md` lesson: a subagent's confident, detailed bug narrative still
   needs checking against the target's actual execution model (sync vs.
   async, single- vs. multi-process) before acting on it, not just against
   whether the described shape sounds plausible.
3. **Cold-read pass, new framing** ("read as someone using the app for the
   first time, no login, does the *mechanism* make sense") found three real
   comprehension gaps, none of them factual drift: the grid page never
   explained what the cookie-based "no login" model actually means for
   Cancel visibility; `/mine/`'s empty state didn't say bookings are
   browser-bound; and `/mine/`'s Move/Cancel errors landed as one
   page-level banner with no way to tell which booking (of several) an
   error was actually about. Fixed all three:
   - `index.astro`: one paragraph explaining the cookie-ownership model
     (`baee21b`).
   - `move.ts`/`cancel.ts`: both now append `&booking=<id>` to their error
     redirects (cancel only when `returnTo=/mine/`, since the grid isn't a
     per-booking view); `mine.astro` renders the error as that booking's own
     `<li>`'s first child, falling back to the old page-level banner when
     the named booking isn't actually one of the visitor's own; also added
     a reassurance line inside the Move `<details>` ("if the new time's
     already taken, this booking stays where it is") and clarified the
     empty-state text (`3189940`, plus a new `spec/move.test.ts` case
     asserting the alert lands on the right row, not a sibling's).

Verified all of it in a real browser at both marking viewports (1920×1080,
390×844), driving the actual flow (booked two slots, expanded Move, forced
a real "taken" clash, confirmed the alert attaches to the correct row only
and the sibling row is untouched) --- not just asserted via spec test
string indices. Everything held at both viewports: no orphaned wrapping, no
overflow, the existing `.field` label/control grouping fix still holds with
the new paragraph inside `<details>`.

`pnpm check` 66/66 after. Committed as two separate commits (content-only
`index.astro` change; the interdependent mine.astro/move.ts/cancel.ts/spec
error-attribution feature). Deployed both to Fly
(`flyctl deploy --remote-only --ha=false -a comp4020-crit7-shitao`) and
confirmed the live URL serves the new paragraph --- this isn't gated by the
push restriction, per standing doctrine-timing note below the memory file's
usual place. Not pushed to origin (inside 24h gate).

## Next action

- Local `main` (`3189940`) is one commit ahead of `origin/main` --- normal
  under the push gate, not a problem to fix. The harness's own tick-snapshot
  commits will pick it up, or the finishing run will push it directly.
- Live Fly app is caught up with local `main` as of this run.
- Least-recently-tried angles for a future non-finishing run: a genuine
  sustained-load check with concurrent *writes* (not just reads/SSE fan-out)
  hammering the same slot from several tabs at once, to watch the DB
  constraint hold under real contention rather than curl-script contention;
  a cold-read of `README.md`/`readme.astro` specifically (still not tried
  with a fresh framing on this repo, per run 13's note); or re-reading
  `owner.ts`/`events.ts` fresh, since this run's mechanism read was `db.ts`
  only.
- Whichever run is told it's the last one: write `PROCESS.md` for real (cite
  real commits across all fourteen+ runs --- `837a441` layout fix, `b93b144`
  privacy fix, `c176080` FK-validation fix, `22bb0f8` route-coverage fix,
  `825b475`/`5318284` redirect-date fixes, `3189940` error-attribution fix
  are the concrete "corrected the work" examples so far), write
  `reflections/crit-7.md` (source `title`, "Build the ANU system you wish
  existed," not a week number), re-run `pnpm check:evidence`, push, and
  redeploy/confirm against the live URL if local `main` has moved past what's
  currently deployed.
