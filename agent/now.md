# now

**Eleventh run for crit-7, 87h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed." Still
well inside the 168h window --- not the finishing run, so no `PROCESS.md`
rewrite, no `reflections/crit-7.md`, no push.

## What this run did

Took stock: `pnpm check` 64/64 green, working tree clean, `flyctl status`
showed the machine `stopped` (expected --- `auto_stop_machines`, confirmed
fine last run). Re-fetched the brief; nothing about the app's scope has
changed since prior runs' reading of it.

Tried the framing run 10's hand-off suggested and hadn't been tried yet:
delegated a subagent to read every SSE event-emit site (`bookings.ts`,
`cancel.ts`, `move.ts`) against every client-side consumption site
(`index.astro`'s `EventSource` listeners), checking for event-name
mismatches, payload-field drift between older/newer routes, and
HTML-injection risk from unescaped fields (`bookedBy` is free-text).
**Found nothing** --- exactly two event names (`booking`, `cancelled`),
both always emitted with the full non-null row shape, both always consumed
via `createElement`/`textContent` (never `innerHTML`), `move.ts` reuses the
existing pair rather than adding a third type. No fix needed.

Followed that with something no prior run's memory records having actually
done: opened **two browser tabs in one named session** (`crit7run11`)
against a scratch dev server (isolated `DATABASE_PATH=/tmp/crit7-scratch/
app.db`, port 4321 --- note PORT env var doesn't actually control Astro's
dev port, it bound the default 4321 regardless), both pointed at `/`, and
watched the SSE live-sync mechanism actually fire end to end in a real
browser rather than just reading the code: booked a slot in tab 1, tab 2's
grid flipped from "Book" to "Booked --- Shitao Test" with **zero reload**;
cancelled it from `/mine/` in tab 1, tab 2's grid flipped back to "Book",
also with zero reload. This is the app's one advertised headline feature
("every open tab sees a slot go from free to booked the moment it
happens") and this is the first run to have actually watched it happen
live across two tabs rather than trusting the code-read or a single-tab
screenshot.

Also checked, all clean, no bugs, no commits needed:
- a viewport *between* the two marking sizes (1280x720) --- renders
  identically to the two extremes, no console errors
- `/mine/`'s Move panel at 390x844 with the panel actually expanded ---
  reconfirmed run 10's `837a441` label/control fix genuinely holds
- `/search/` at 390x844, including running an actual query (empty-DB "no
  match" result renders cleanly, consistent with `b93b144`'s LIKE-escape
  fix)
- `/readme/` (About) at 390x844 --- no overflow, renders cleanly

One tooling gotcha found and recorded in `MEMORY.md`: `agent-browser find
role button --name "Move"` doesn't match a bare `<summary>` disclosure
trigger at all (Chrome's a11y tree doesn't expose it under the `button`
role the way `find role` expects) --- worked around with `eval
"document.querySelector('summary').click()"`.

Scratch server and DB cleaned up properly this run: `agent-browser
--session ... close`, `lsof -ti:4321 | xargs -r kill`, re-checked `lsof
-ti:4321` empty before trusting the port was free (per the standing `pkill`
gotcha), scratch `.db`/`.db-wal`/`.db-shm` files removed.

**No code changes this run.** Working tree is clean, nothing to commit,
nothing to redeploy (live Fly app already matches local `main` since run
10's deploy of `837a441`).

## Next action

- Genuinely nothing currently known broken, across the widest verification
  pass yet (SSE structural read + live two-tab test + mid-viewport + two
  pages not checked in several runs). Real accounts remain the one named
  out-of-scope gap (README says so explicitly) --- not a bug.
- A framing not yet tried on this repo: the date-navigation links (`&larr;
  {prevDate}` / `{nextDate} &rarr;`) are plain `<a href>` full-page
  reloads, so each one tears down and rebuilds the `EventSource` with a
  fresh `date` var --- read as correct from `index.astro`'s source
  (`if (booking.date !== date) return;` guards both handlers) but never
  actually clicked through in a browser. Worth an actual click-through
  pass (not just a code read) if a future run wants one more angle: click
  next-day, book something on that day in tab 1, confirm tab 2 (still on
  the original day) does NOT show it, then confirm a tab actually on the
  new day does.
- Whichever run is told it's the last one: write `PROCESS.md` for real
  (cite real commits across all eleven+ runs --- `837a441` layout fix,
  `b93b144` privacy fix, `c176080` FK-validation fix, `22bb0f8` route-
  coverage fix are the concrete "corrected the work" examples so far),
  write `reflections/crit-7.md` (source `title`, "Build the ANU system you
  wish existed," not a week number), re-run `pnpm check:evidence`, push,
  and redeploy/confirm against the live URL if local `main` has moved past
  what's currently deployed.
