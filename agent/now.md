# now

**Tenth run for crit-7, 93h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push.

## What this run did

Took stock (git log, `pnpm check` --- 64/64 green, `flyctl status` --- app
was `stopped` but that's just `auto_stop_machines`/`min_machines_running=0`
in `fly.toml`, confirmed fine by a `curl` waking it to a real 200). Re-read
`db.ts` and all four API routes fresh, applying run 9's suggested framing
("read every route's input-validation asymmetry as a class") --- found
nothing new; roomId/slot/date are now validated symmetrically everywhere,
`bookedBy` is always rendered through Astro's auto-escaping or
`textContent`, never `innerHTML`, and the one raw-string `querySelector`
build (index.astro's SSE handlers) can't actually receive an unvalidated
slot/roomId since both are enum/FK-checked before a row is ever created.
No bug this pass from that angle.

**Found and fixed a real layout bug via the real-browser pass** (`837a441`):
`/mine/`'s Move form (`label, select, label, input[date], label, select,
button`, seven flat children of the shared `flex-wrap` form rule) wrapped
each child independently at 390px, orphaning "Date" at the end of the Room
line and "Slot" at the end of the Date line --- each label visually
detached from the control it names. `pnpm check` was green the whole time;
only caught by actually expanding the `<details>` Move panel and
screenshotting at the mobile marking viewport, not just loading the page.
Same root shape as the standing "flex/grid container mixing an inline
element with adjacent text" bug class already in `MEMORY.md` (run 7's
comma-orphan bug), extended to a label+control pair rather than a
link+text pair --- see `MEMORY.md`'s new eighth confirmation for the full
writeup. Fixed by wrapping each label+control in a `<span class="field">`.
Verified end-to-end in a real browser, named session (`crit7run10`): booked
a real slot on a scratch dev server (isolated `DATABASE_PATH`, port 4790),
drove Move (changed slot 09:00 -> 11:00, confirmed the redirect and the new
row), drove Search (found the booking by name), confirmed the fix at both
1920x1080 and 390x844, then cancelled the scratch booking and killed the
scratch server (`lsof -ti:4790` empty afterward, not just trusting exit
codes).

**Deployed and verified live** (`flyctl deploy --remote-only --ha=false`):
confirmed the live app serves the fixed layout by making one real booking
on `https://comp4020-crit7-shitao.fly.dev/`, screenshotting the expanded
Move panel at 390x844 (labels correctly beside their controls), then
cancelling that booking and confirming `/mine/` shows "Nothing booked" ---
no junk booking left on the live app.

## Next action

- Nothing currently known broken. All four pages (`/`, `/mine/`, `/search/`,
  `/readme/`) have had a real-browser pass at both marking viewports within
  the last two runs.
- Try a framing not yet used on this repo for the next fresh-eyes pass:
  the standing "vary the framing" lesson (from assignment-2, repeated in
  `MEMORY.md`) generalises past content-heavy deliverables --- for this
  app specifically, an untried angle is "read every SSE-broadcast field
  (`booking.roomId`, `.slot`, `.date`, `.bookedBy`) against every place a
  client-side script consumes it, as a class" rather than the route/db
  validation angle already tried twice (runs 7 and 9) and the accessibility/
  layout angle just tried this run.
- Real accounts remain the one named out-of-scope gap (README says so
  explicitly) --- not a bug, don't "fix" it.
- Whichever run is told it's the last one: write `PROCESS.md` for real
  (cite real commits across all ten runs, including this run's `837a441`
  layout fix and run 9's `b93b144` privacy fix as concrete "corrected the
  work" examples), write `reflections/crit-7.md` (source `title`, "Build
  the ANU system you wish existed," not a week number), re-run
  `pnpm check:evidence`, then push and redeploy/confirm against the live
  URL. This run's commit (`837a441`) stays local-only per the doctrine's
  push gate (inside 24h to cutoff); the Fly deploy already happened this
  run since deploy isn't gated the same way (see the standing `MEMORY.md`
  note on this).
