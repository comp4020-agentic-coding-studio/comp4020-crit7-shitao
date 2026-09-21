# now

**Second run for crit-7, 159h to cutoff at start.** Deliverable is
`comp4020-crit7-shitao`: "Build the ANU system you wish existed," brief at
`https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/07-anu-system.json`.
Still well inside the 168h window --- not the finishing run, so no
`PROCESS.md` rewrite, no `reflections/crit-7.md`, no push. Those stay for
whichever run is told it's last.

## What this run built

Deepened run 1's room-booking prototype by picking the candidate the prior
hand-off named: cancellation, gated by a lightweight per-browser identity,
closing two of the README's declared out-of-scope gaps into one coherent
feature rather than two separate ones.

- `src/lib/schema.ts` + `drizzle/0001_cheerful_leo.sql`: new `owner_token`
  column, `default("")` so the migration doesn't crash against the existing
  production row (SQLite requires a default for `NOT NULL ADD COLUMN` on a
  non-empty table) --- old rows get an empty-string token that can never match
  a real cookie, so they're simply uncancellable, the safe default.
- `src/lib/owner.ts` (new): mints a random UUID into a `booker` cookie the
  first time a browser books anything. Not an account --- it only answers
  "did this browser make this booking," never vouches for the typed name.
- `src/lib/db.ts`: `cancelBooking(id, ownerToken)` deletes with
  `WHERE id = ? AND owner_token = ?` --- the ownership check is a DB-level
  constraint on the delete itself, not a UI-only gate, per this repo's own
  CLAUDE.md rule.
- `src/pages/api/bookings.ts`: now validates `slot` against the fixed
  `SLOTS` enum (previously unvalidated) and wires the owner cookie into
  `createBooking`.
- `src/pages/api/bookings/[id]/cancel.ts` (new route) + `src/pages/api/events.ts`:
  cancel route deletes and emits a `cancelled` bus event; **fixed a real bug
  caught by the new spec test** --- `events.ts` had only ever subscribed to
  `"booking"`, never `"cancelled"`, so a cancellation would have silently
  never reached any other open tab.
- `src/pages/index.astro`: cancel button renders only when the visiting
  browser's cookie matches the booking's owner token. Client-side
  `cancelled` SSE handler rebuilds the freed cell via
  `createElement`/`textContent`, not `innerHTML` --- self-caught XSS risk,
  see below.
- `spec/booking.test.ts`: four new contract tests (cancel-and-free, refuse
  without the right cookie, SSE broadcasts the cancellation) plus the three
  pre-existing ones. All 31 green.
- `README.md`: cancellation and the identity gap are no longer listed as
  out-of-scope; added a paragraph on what the owner-token cookie does and
  doesn't vouch for.

Committed in five scoped commits (schema, api, pages, spec, docs) ---
`be4b831` through `b528767` --- each one individually verified buildable and
green (typecheck + full test suite) before moving to the next, using
`git stash push --keep-index` to isolate what each commit would actually
contain, since several of these files are interdependent (`db.ts`'s new
required `ownerToken` param and the route that passes it can't be split
across two commits without a red state in between).

**Self-caught security issue**: the first draft of the cancelled-SSE client
handler used `innerHTML` with template interpolation of `booking.slot`, and
the server didn't validate `slot` against the enum --- a crafted POST could
have stored and later broadcast arbitrary HTML to every other open tab.
Fixed with both server-side validation and safer client-side DOM
construction before it ever shipped.

Verified with a real-browser pass using two independently-cookied
`agent-browser` sessions (to simulate "two different browsers"): booking
renders a cancel button only for its own owner, a second session sees no
cancel button on the same booking, cancelling from the owner session
broadcasts live to the second session's SSE listener and rebuilds its cell
into a fresh bookable form --- no reload, no console errors either session.
Checked 1920x1080, 1280x720 (between the two marking sizes, per the standing
"declared viewports are necessary but not sufficient" lesson), 390x844, and
a five-step resize sequence within one session (1024x768 -> 768x1024 ->
600x800 -> 1920x1080 -> 390x844) with no layout drift and no errors --- this
page is a plain table, not a canvas, so no feedback-loop risk expected, and
none found.

Deployed to Fly.io (`flyctl deploy --remote-only --ha=false -a
comp4020-crit7-shitao`) and re-verified the *live* URL, not just the local
build: booked and cancelled a slot directly against
`https://comp4020-crit7-shitao.fly.dev/`, confirmed the cell frees back to a
bookable form. A stray `Booked --- Shitao live-verify` from run 1's own live
check is still sitting on the volume --- harmless demo state, left alone
since there's no owner cookie to cancel it with (correct behaviour, not a
bug to chase).

## Sandbox gotcha worth keeping (in MEMORY.md now)

`pkill -f "..."` in this Bash tool reliably kills the whole tool invocation
with exit code 144, no output --- not a real "no matching process." Use
`lsof -ti:$PORT | xargs -r kill` for all server teardown instead. Also:
self-spawning a Node script via `child_process.spawn` to both boot a server
and drive test logic against it gave unreliable/missing stdout in this
sandbox; the reliable pattern is a plain backgrounded Bash server + `curl`.

## Next action

Still not the finishing run. Candidates for the next deepening pass, in
rough order of what's left from the original README's scope list:

- **A date picker** (today-only is still the one remaining declared gap ---
  accounts are the other, but that's a much bigger lift than this repo's
  "no login, a typed name not an account" framing wants).
- Revisit whether the owner-token cookie should also gate *editing* a
  booking (currently there's no edit, only book/cancel) if a date picker
  makes "wrong date, need to fix it" a real scenario instead of cancel-and-
  rebook.
- Nothing currently known broken. `pnpm check` clean, 31/31 tests, live URL
  verified serving the deployed commit.

Whichever run is told it's the last one: write `PROCESS.md` for real (cite
the actual commits, including this run's), write `reflections/crit-7.md`
(source `title`, not a week number), re-run `pnpm check:evidence`, then push
and redeploy/confirm against the live URL.
