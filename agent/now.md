# now

**Thirteenth run for crit-7, 69h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still well
inside the 168h window --- not the finishing run, so no `PROCESS.md` rewrite,
no `reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 65/65 green, working tree clean, `origin/main` at
`b6e422b` (== local tip --- the harness's tick-snapshot commit had already
pushed run 12's `825b475`/`5318284`, so there was no push-gate tension to
manage this run). Re-fetched the brief; unchanged. Confirmed the live Fly app
(`comp4020-crit7-shitao.fly.dev`) responds 200 and serves today's date ---
machine showed `state: stopped` in `flyctl status` but that's just
autostop-on-idle, not staleness; a plain `curl` woke it fine.

Picked up run 12's two flagged next actions:

1. **`move.ts`'s `returnTo` handling** --- confirmed from the code alone (no
   live check needed) that it's not a candidate for the redirect-drops-
   view-state bug already fixed on `bookings.ts`/`cancel.ts`: its form never
   sends a `date` field, and `/mine/` (the only place it's reached from)
   isn't date-scoped in the first place, so there's no view state to lose.
2. **A live multi-tab SSE session** --- ran on an isolated scratch dev server
   (`DATABASE_PATH` pointed at `/tmp`, port 4321, cleaned up after), two
   independent named `agent-browser` sessions (`crit7-tabA`/`crit7-tabB`,
   avoiding the shared-default-session hazard). Booked a slot in tab A;
   confirmed tab B's cell flips to "Booked" live, no reload, and correctly
   shows no Cancel button (different owner cookie). Cancelled from tab A;
   confirmed tab B's cell rebuilds the bookable form live too. Both SSE
   paths (`booking` and `cancelled` listeners in `index.astro`'s inline
   script) verified end to end for the first time across two genuinely
   separate sessions, not just vitest's `/api/events` timeout-based check.
   Clean `agent-browser errors`/`console` throughout.

Also did a fresh cold-read + browser pass on content and layout, since the
last one was a few runs back:

- Read `README.md`, `readme.astro`, `index.astro`, `mine.astro`,
  `search.astro`, `move.ts` cold for factual drift --- none found, all
  internally consistent (rooms count, window length, owner-token framing,
  search's empty-query guard all match what the code does).
- `spec/routes.ts` still lists all four real pages (`/`, `/mine/`,
  `/search/`, `/readme/`) --- no repeat of the earlier `/search/`-missing
  drift.
- Screenshotted all four pages at both marking viewports (1920×1080,
  390×844), plus one in-between (1280×720) and a resize sequence
  (1280×720 → 800×600 → 500×900) on the grid page specifically, since this
  app has the same flex-table-on-narrow-viewport shape that's bitten other
  repos. Expanded the Move `<details>` panel at 390×844 with a real
  booking present to reconfirm `837a441`'s label/control grouping fix still
  holds. Everything clean: no orphaned wrapping, no unbounded growth, no
  console errors, on a second isolated scratch server (port 4322).

No new bugs found this run. Everything checked out: schema/redirect fixes
from run 12 hold, `move.ts` settled as a non-issue, live SSE propagation
confirmed for real across two tabs, content and layout both clean at three
viewports plus a resize sequence.

## Next action

- Nothing currently outstanding. `pnpm check` 65/65, live Fly app serving,
  local `main` == `origin/main` == what's deployed.
- Least-recently-tried angles for a future non-finishing run, in rough order:
  a fresh cold-read pass with a *new* framing on `README.md`/`readme.astro`
  (the ones tried so far are "fact drift" and "does it match the code" ---
  an angle like assignment-2's "read as a confused first-time user" hasn't
  been tried on this repo specifically); a genuine sustained-load check (many
  bookings/cancels in quick succession across more than two tabs, past what
  two tabs proves); or re-reading `src/lib/db.ts`/`owner.ts`/`events.ts`
  fresh for a mechanism this run's page-level read wouldn't surface.
- Whichever run is told it's the last one: write `PROCESS.md` for real (cite
  real commits across all thirteen+ runs --- `837a441` layout fix, `b93b144`
  privacy fix, `c176080` FK-validation fix, `22bb0f8` route-coverage fix,
  `825b475`/`5318284` redirect-date fixes are the concrete "corrected the
  work" examples so far), write `reflections/crit-7.md` (source `title`,
  "Build the ANU system you wish existed," not a week number), re-run
  `pnpm check:evidence`, push, and redeploy/confirm against the live URL if
  local `main` has moved past what's currently deployed.
