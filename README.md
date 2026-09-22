# Study rooms

A small full-stack replacement for one slice of ANU's own group-study-room
booking page: pick a free hourly slot in one of four rooms today, put your
name on it, and it's still booked when you reload — or when anyone else does.
Bookings live in SQLite on the machine's volume, so state survives a reload
and a redeploy, and a server-sent-events stream tells every other open tab
the instant a slot goes from free to booked.

## What good looks like here

The real system's actual failure isn't that it lacks a calendar — it's that
on the day you show up, you have no way of knowing whether someone else beat
you to the room. Two groups turn up to the same door at the same time because
the page you booked from never told you that had already happened. So this
prototype is scoped tightly around that one moment: today only, a fixed list
of rooms, fixed hourly slots, no login (a typed name, not an account) — and
all of that budget spent on making the one property real: a room, date and
slot can only ever be booked once, and everyone watching finds out live, not
by walking to the room.

What's enforced, not just hoped for: `src/lib/schema.ts` puts a unique
constraint on `(room_id, date, slot)`, so a double-booking is impossible at
the database layer even if two requests race each other — `spec/booking.test.ts`
drives this over HTTP: a booking persists across a reload, a second attempt
at an already-booked slot is refused and the first booking is left standing,
and a new booking reaches a second client over `/api/events` inside the
test's timeout.

A booking can now be cancelled, freeing the slot for everyone live over the
same SSE stream — gated by a random token set in a cookie the first time a
browser books anything (`src/lib/owner.ts`), checked at the database layer
alongside the row's own id
(`WHERE id = ? AND owner_token = ?` in `cancelBooking`). That token answers
"did this browser make this booking," nothing more: it doesn't vouch for the
typed name, and clearing cookies or switching browsers loses the claim, same
as the booking itself was never behind a login.

A date picker closes the other of the two gaps the first pass named — bounded
to a two-week look-ahead (`BOOKING_WINDOW_DAYS` in `src/lib/slots.ts`), not an
open-ended calendar: the actual planning horizon for a study room is "this
week or next," and the real failure this app targets (two groups turning up
to the same door) is a same-day problem regardless of how far out the picker
reaches. `isBookableDate` is the single gate both the page (which date it'll
render) and `/api/bookings` (which date it'll accept) check against, so a
hand-built request past the window is refused the same way an unlisted slot
already was.

Since the grid only ever renders one date, finding a booking you made three
days ago meant clicking through the date picker one day at a time — so
`/mine/` reads the same owner token across the whole window instead of one
date, and lists everything that cookie has booked from today onward, oldest
first. Cancelling from there uses the same `cancelBooking` gate as the grid's
own cancel button; the only new thing is where it redirects back to
afterwards, and that's an explicit whitelist of the two pages it can come
from, not whatever a form happens to send.

A booking can be edited in place from `/mine/` — room, date and slot, all
three — rather than only cancel-and-rebook. That's not just convenience:
cancel-then-rebook has a real window where you've given up the old slot and
the new one turns out taken, so you end up holding neither. Moving is one
`UPDATE`, checked against the same `(room_id, date, slot)` unique constraint
SQLite already enforces on insert — if the destination's taken, the
statement fails and the original row is untouched, so you keep what you had.
A moved booking broadcasts as the same "cancelled" then "booking" pair a
cancel-then-rebook would produce, on purpose: every open tab already
listens for both, so there's no third SSE event type to invent or keep in
sync with a second frontend.

What's a judgement call, left to the crit: whether the grid reads clearly at
a glance, whether "book here instead of there" is the right frame for the
real annoyance, and whether two weeks is the right window — real accounts are
the one gap this prototype still doesn't try to close.
