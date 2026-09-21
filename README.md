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

What's a judgement call, left to the crit: whether the grid reads clearly at
a glance, whether "book here instead of there" is the right frame for the
real annoyance, and whether four rooms and one day is the right scope for a
first pass — a date picker, cancellation, and accounts are real gaps this
prototype doesn't try to close yet.
