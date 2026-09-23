# now

**Eighth run for crit-7, 111h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run did

**Found and fixed a real coverage gap** (`22bb0f8`): `spec/routes.ts` --- the
list `spec/invariants.test.ts` runs the accessibility/landmark/viewport/axe
checks against --- still only had `["/", "/mine/", "/readme/"]`, three
commits after `/search/` shipped (`45a9328`). `spec/routes.ts`'s own header
comment says "add it here or the invariants stop covering it," and nobody
had. `pnpm check` stayed green the whole time because the existing tests for
the other three routes don't care that a fourth exists. Fixed by adding
`/search/` to the array; test count went 55 → 63, all green (the eight new
invariant checks for that route all pass as-is, so no other fix was needed).
See `MEMORY.md` for the generalised lesson (coverage arrays with a
self-documented update rule are a distinct silent-drift risk from the
already-documented SSE pub/sub one).

**Real-browser verification pass**, this time deliberately at a viewport
*between* the two marking extremes (1280×720, not yet tried on this specific
repo per the standing "check a size between the markers too" refinement) plus
the two extremes themselves (390×844, 1920×1080), named session `crit7run8`.
Made a real booking, searched for it from `/search/`, opened the Move
disclosure on `/mine/` at 390px, cancelled it to clean up. No console errors,
no layout breakage, no orphaned-comma regression at mobile width. Preview
server torn down and port confirmed free via `lsof` after (used
`nohup ... & disown` + `lsof -ti:4321` to start/stop, not `pkill`, per the
standing gotcha that `pkill -f` can kill the whole Bash tool call in this
sandbox).

**Did not redeploy.** `flyctl status` showed the live app already at version
5, matching run 7's last commit (`c176080`) before this run started. This
run's own commit (`22bb0f8`) only touches `spec/routes.ts` --- a test-time
file, not part of the `astro build` output --- so the live app's actual
behaviour is unchanged and redeploying would ship byte-identical code.

## Next action

Still not the finishing run. What's left from the original scope list:

- **Real accounts** remain the one named gap --- explicitly out of scope,
  per the "no login, a typed name not an account" framing in `README.md`.
- No new bug found in the app's own behaviour this run (the one found was a
  test-coverage gap, not a shipped-behaviour bug) --- `src/lib/*.ts` and
  every `src/pages/**` file were already re-read fresh in run 7 with nothing
  found there. A future run could try a different cold-read framing (per the
  assignment-2 "vary the framing, not just rerun the same read" lesson) if
  it wants to keep hunting, or spend a run on the finishing-run checklist
  dry-run if nothing else surfaces.
- Nothing currently known broken. Deploy state: live app is version 5,
  matching commit `c176080` (run 7's fix) --- one commit behind local `main`
  (`22bb0f8`), but that commit has no runtime effect so this isn't a real gap
  to close before the next run that does change `src/`.

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits across all eight runs), write `reflections/crit-7.md`
(source `title`, "Build the ANU system you wish existed," not a week
number), re-run `pnpm check:evidence`, then push and redeploy/confirm
against the live URL.
