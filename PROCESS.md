# Process overview

## What I built

`README.md` has the full account. In short: the ANU system that annoys me is
the library's group-study-room booking page, which never tells you someone
else just took the room until you reload. This is that page rebuilt around
one property: a room/date/slot can only be booked once, enforced by a
database constraint, and every open tab hears about it live over SSE.

## How I got here

The starter came from `template-dynamic`
([`2b0c1bd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/2b0c1bd)).
The first real commit swapped its guestbook schema for
`rooms`/`bookings` with a unique `(room_id, date, slot)` constraint
([`c955886`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/c955886)),
then wired the booking endpoint to broadcast over SSE and built the grid UI
on top
([`837e1f3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/837e1f3),
[`0a0d7b2`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/0a0d7b2)).
Every later feature — cancellation gated on a per-browser owner-token cookie
([`139dadc`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/139dadc)),
a two-week date window
([`d8aeaad`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/d8aeaad)),
a cross-date `My bookings` view
([`9cb668a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/9cb668a)),
an atomic in-place Move
([`c820b03`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/c820b03)),
and a name search across the whole window
([`45a9328`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/45a9328))
— landed as schema-then-route-then-page-then-spec-then-docs slices, each one
buildable and green on its own.

The harness was Claude Code runs against this repo's own memory: each run
reads `now.md` for the last hand-off, takes stock of `git log`, then does one
or two focused things rather than a sweep. That shape is what surfaced most
of the real bugs, because each run brought a fresh angle instead of
re-confirming the last one.

**Grounding beat assumption repeatedly.** Reading `bookings.ts`'s own comment
about rejecting a hand-built `slot` string, then noticing `roomId` had no
equivalent check, wasn't enough on its own — building a scratch server and
`curl`ing a bogus room id confirmed a raw 500 (SQLite's foreign-key
enforcement, not app code) rather than the clean rejection every other bad
field got
([`c176080`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/c176080)).
Same pattern found that `searchBookings`'s empty-query guard didn't stop
`%` or `_` from acting as SQL LIKE wildcards and leaking every name in the
system — confirmed by actually booking a name and searching those two
characters before fixing it
([`b93b144`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/b93b144)).

**The redirect-date bug is the one that most changed how I test a route.**
`spec/booking.test.ts` already had a "books a future date" test, and it
passed the whole time, because it asserted the booking persisted via a
fresh fetch to the expected URL rather than asserting on the POST response's
own `Location` header. The actual bug — booking or cancelling from any day
but today bounced the browser back to today, hiding exactly the live-update
property the app exists to demonstrate — only surfaced once a run clicked
the next-day nav link before booking, something eleven prior manual passes
had never happened to do
([`825b475`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/825b475),
[`5318284`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/5318284)).
Fixed both the redirect and the test's assertion, so the same gap can't
reopen invisibly.

**Correcting without changing code, too.** A subagent flagged a plausible-
sounding TOCTOU race in `moveBooking`. Rather than adding a defensive
re-check for a scenario that looked real, I traced the actual execution
model — Node's single-threaded event loop plus `better-sqlite3`'s fully
synchronous API mean there's no yield point between the SELECT and the
UPDATE — then confirmed it empirically with genuinely parallel backgrounded
`curl` races against a scratch database (create-vs-create, move-vs-move,
cancel-vs-move, tens of rounds each, checked against the DB directly rather
than trusting HTTP status codes). All four combinations came back clean, so
no code changed; the correction was catching a plausible-but-wrong claim
before acting on it, not fixing a bug.

Layout bugs only showed up by actually opening both marking viewports:
a flex-wrap container detaching a `Move` field's label from its control at
390px
([`837a441`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/837a441)),
and the same shape one commit earlier on the booking-row date/slot/room line
([`f7d7efe`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/f7d7efe)).
Both were invisible to `pnpm check`'s 66 green tests, because nothing in
that suite renders a real browser at a real width. The most recent commit
([`ac848aa`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-shitao/commit/ac848aa))
went the other direction — a cold read of the spec's own regexes found they
depended on exact attribute order and markup adjacency rather than the
values they were meant to check, so the tests themselves got rewritten to
match by content.
