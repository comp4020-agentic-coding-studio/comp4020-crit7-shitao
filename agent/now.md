# now

**Twelfth run for crit-7, 76h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still
well inside the 168h window --- not the finishing run, so no `PROCESS.md`
rewrite, no `reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 64/64 green, working tree clean, nothing new
upstream since run 11 (`837a441` still the tip). Re-fetched the brief;
unchanged.

Picked up run 11's one flagged-but-untried framing: actually click through
the date-navigation links in a live browser before booking, rather than
reading the guard clauses and trusting them. Ran an isolated scratch dev
server (cleaned up after each use), opened a real `agent-browser` session,
clicked "next day," and booked a slot there.

**Found and fixed two real bugs, same shape, two routes:**

1. `/api/bookings`'s success and slot-taken redirects were hardcoded to `/`
   and `/?error=taken`, dropping the `date` query param — booking (or
   losing a race for) a slot while viewing any day but today bounced the
   browser back to *today's* grid, which shows no sign the booking
   happened. The existing "books a future date" spec test had passed the
   whole time because it checked persistence via a fresh fetch to the
   known-correct URL, never asserting on the POST's own `Location` header.
   Fixed in
   [`825b475`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/825b475):
   append the already-validated `date` to both redirects, plus the missing
   `location` assertions.
2. Checking the sibling route touching the same grid (`cancel.ts`) for the
   identical shape paid off immediately: the grid's cancel form sent no
   `date` field at all, so `cancel.ts`'s `returnTo` fallback of `/` always
   bounced to today regardless of which date you cancelled from.
   `/mine/`'s cancel form was unaffected (already sends `returnTo="/mine/"`,
   and `/mine/` isn't date-scoped anyway). Fixed in
   [`5318284`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/5318284):
   grid's cancel form now sends `date` like its booking form beside it,
   `cancel.ts` folds it into the `/` target, new spec test covers cancelling
   on a future date.

Both fixes verified live on a scratch server (book → redirect lands on the
booked date; slot-taken clash → same; cancel from grid on a future date →
redirect lands on that date; cancel from `/mine/` → still lands on `/mine/`,
no regression), all with clean `agent-browser errors`. 65/65 tests green,
`pnpm typecheck`/`astro check` clean. Full writeup of both in `MEMORY.md`.
Scratch servers/DBs cleaned up each time, `lsof -ti:4321` confirmed empty
before moving on.

Deployed both fixes (`flyctl deploy --remote-only --ha=false -a
comp4020-crit7-shitao`) since deploy isn't gated the same way push is ---
confirmed the live URL responds 200 after each deploy, and screenshotted
both marking viewports against the live app after the first deploy (clean,
no console errors).

**No push this run** --- push is a finishing step, gated to inside 24h to
cutoff. Local `main` (`5318284`) is two commits ahead of `origin/main`
right now; that's expected, not drift.

## Next action

- `origin/main` is two commits behind local `main` (`825b475`, `5318284`)
  --- correct per the push gate, not something to fix.
- The live Fly app is already caught up with `5318284` (deployed this run).
- The redirect-drops-view-state bug shape has now been checked and fixed on
  both routes that touch the grid (`bookings.ts`, `cancel.ts`). `move.ts`
  already sends/uses `returnTo` from `/mine/` only (never reached from the
  grid, and `/mine/` isn't date-scoped), so it isn't a candidate for the
  same bug --- confirmed by reading it this run, not yet by a live
  click-through. Worth a quick live check next time for completeness, but
  low suspicion given the code shape already differs from the two bugs just
  found.
- No other framing currently known to expose a bug. A fresh cold-read pass
  (varying what it's looking for each time, per the standing technique) on
  `PROCESS.md`/`README.md` content, or another live multi-tab SSE session,
  are the two angles least recently tried on this repo specifically.
- Whichever run is told it's the last one: write `PROCESS.md` for real
  (cite real commits across all twelve+ runs --- `837a441` layout fix,
  `b93b144` privacy fix, `c176080` FK-validation fix, `22bb0f8` route-
  coverage fix, `825b475`/`5318284` redirect-date fixes are the concrete
  "corrected the work" examples so far), write `reflections/crit-7.md`
  (source `title`, "Build the ANU system you wish existed," not a week
  number), re-run `pnpm check:evidence`, push, and redeploy/confirm against
  the live URL if local `main` has moved past what's currently deployed.
