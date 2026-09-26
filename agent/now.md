# now

**Seventeenth run for crit-7, 39h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still inside
the 168h window --- not the finishing run, so no `PROCESS.md` rewrite, no
`reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 66/66 green, working tree clean, local `main` at
`ac848aa` (already committed by the time this hand-off is being written),
`origin/main` at `8a4f81e` (a tick-snapshot commit, expected --- see the
standing "out-of-band commits are normal" MEMORY.md note). `flyctl status`
showed the machine `stopped` (normal idle) at the image from run 14's deploy.

Picked up both of run 16's suggested angles:

1. **Live browser verification pass** at both marking viewports (1920×1080,
   390×844) across `/`, `/mine/`, `/search/`, `/readme/`: booked a slot,
   confirmed reload-survival, expanded the Move disclosure, checked the
   booking grid's horizontal scroll on mobile. Clean --- no new bugs, prior
   fixes (Move label grouping) still hold.

2. **Template-brittleness review**, delegated to a general-purpose/sonnet
   subagent: read every `spec/*.test.ts` regex assertion cold against the
   actual `.astro` markup it targets, looking for cosmetic-change fragility
   rather than correctness (already covered by run 16's contract-drift
   pass). Found two real instances: eleven `data-room="X" data-slot="Y"`
   lookups required that exact attribute order/adjacency, and `move.test.ts`
   hardcoded the literal `</a>, HH:MM` punctuation joining a booking's date
   and slot on `/mine/`. Fixed with a shared `spec/cell.ts`
   (`cellTagSource`/`bookingRow`) matching on the values themselves via
   independent lookaheads/tolerant gap-matching instead of literal adjacency
   --- verified against reordered-attribute, inserted-attribute, and
   span-wrapped-slot markup with a standalone Node script before trusting
   it. `ac848aa`.

3. **Cancel-vs-move cross-endpoint race** (run 16's other suggested angle,
   until now untried on this repo): built a scratch server + throwaway DB,
   8 independent rounds each on their own date, each racing "cancel booking
   A" against "move booking B into A's slot" as genuinely parallel
   backgrounded `curl`s. Confirmed directly against the DB after each round:
   every round left exactly one surviving row for the contested slot, no
   500s, no double-booking --- B ends up either still at its original slot
   (move lost the race, correctly rejected as `taken`) or cleanly relocated
   (move won because the cancel's DELETE committed first), varying
   non-deterministically round to round exactly as the single-threaded,
   synchronous-DB architecture predicts. This is the fourth genuine
   multi-writer race combination confirmed clean on this repo (create-vs-
   create, move-vs-move, now cancel-vs-move) --- no app code change, pure
   verification.

Tooling note: a bare `curl -X POST` with no `-d`/Content-Type header (no
body at all) makes `request.formData()` throw inside the cancel route,
producing a 500 that a real browser's form submit could never trigger (every
`<form>` POST always carries a body/Content-Type, even an empty one) --- not
an app bug, just a malformed test request; fixed by always sending an
actual (possibly empty) urlencoded body, matching what `spec/*.test.ts`
already does via `new URLSearchParams()`.

Both scratch DB and server torn down; port confirmed free after. Also hit
the standing "wrong port" gotcha again in a new shape: `PORT=4399` for the
scratch server silently bound to an unrelated pre-existing `aps-ai-tracker`
dev server already listening there (different repo entirely) --- caught by
the page title in the boot-check response, not by the curl's exit code.
Picked a genuinely free port via a quick `socket.bind(('127.0.0.1', 0))`
probe instead of guessing a literal.

No app-code commit this run, so no Fly redeploy --- `ac848aa` only touches
`spec/`, which isn't part of the built server bundle the Dockerfile ships.

## Next action

- Nothing pending to push or redeploy.
- Both of run 16's suggested angles are now done. A future non-finishing run
  should pick a fresh one rather than assume crit-7 is done (per the standing
  "two clean passes in a row is not evidence the well is dry" doctrine) ---
  no specific untried angle is currently queued; a full read-through of
  `README.md`/`readme.astro`'s prose against what the app actually does would
  be a reasonable next default, since every prior pass has been either
  browser-viewport or race/contract verification, never a cold content read.
- Whichever run is told it's the last one: write `PROCESS.md` for real (cite
  real commits across all seventeen runs --- `837a441` layout fix, `b93b144`
  privacy fix, `c176080` FK-validation fix, `22bb0f8` route-coverage fix,
  `825b475`/`5318284` redirect-date fixes, `3189940` error-attribution fix,
  `baee21b` cookie-model explainer, `ac848aa` spec-brittleness fix are the
  concrete "corrected the work" examples so far), write `reflections/crit-7.md`
  (source `title`, "Build the ANU system you wish existed," not a week
  number), re-run `pnpm check:evidence`, push, and redeploy/confirm against
  the live URL if local `main` has moved past what's currently deployed.
