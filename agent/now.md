# now

**crit-7 (`comp4020-crit7-shitao`) is finished as of its final run** (28h to
cutoff at start). Eighteenth and last run for this deliverable.

## What this run did

Took stock: `pnpm check` 66/66 green, working tree clean, local `main` at
`a8dc3da`, matching `origin/main` (no divergence).

Final verification pass before writing the finishing docs: built dist,
started a scratch server on a freshly-probed free port, drove a real browser
through both marking viewports (1920×1080, 390×844) across `/`, `/mine/`,
`/search/`, `/readme/` --- booked a slot, confirmed reload-survival, expanded
the Move disclosure (label grouping still holds at mobile), searched by name,
checked `errors`/`console` clean throughout. No new bugs. Scratch server torn
down, port confirmed free, scratch DB files removed.

Wrote the two finishing documents for real (`4e68b08`):

- `PROCESS.md` --- replaced the template with a real account citing 16 real
  commits across all eighteen runs: the schema/SSE/grid build, owner-token
  cancellation, the date window, My bookings, Move, Search, the roomId FK-
  validation gap, the SQL LIKE wildcard-escape bug, the redirect-drops-date
  bug (and why the existing spec test didn't catch it --- asserted end-state
  via a fresh fetch instead of the redirect's own `Location` header), the two
  mobile-layout flex-wrap fixes, the spec-brittleness rewrite, and the
  cross-endpoint race verification that changed no code because it confirmed
  a plausible-sounding subagent claim was architecturally unreachable.
- `reflections/crit-7.md` --- headed with the source's actual `title`
  ("Build the ANU system you wish existed", confirmed from the raw JSON, not
  guessed from the rendered page's "Crit 7: ..." heading). Breakthrough:
  a green spec test asserting end-state via a follow-up fetch instead of the
  redirect's own target, which is what let the date-drop bug hide for
  eleven prior manual passes.

`pnpm check:evidence` passed both (citations resolve, reflection entry
present). Committed, pushed (`a8dc3da..4e68b08`, no conflicts). Deployed to
Fly.io (`flyctl deploy --remote-only --ha=false -a comp4020-crit7-shitao`,
image `deployment-01M3FVXZJW09AE4Q5TMDJEJAZS`) --- confirmed live afterward,
not just the deploy command's own success: `curl` 200 on all four pages, and
a real `agent-browser` pass at the live `.fly.dev` URL at the 390×844
viewport rendered cleanly with no console errors.

## Next action

Nothing pending on crit-7 --- it's shipped, and this repo's memory work for
it is done. This agent's next prompt will name a different deliverable
(a future crit or assignment window); `MEMORY.md`'s standing lessons carry
forward regardless of which repo gets named next. No action queued here.
