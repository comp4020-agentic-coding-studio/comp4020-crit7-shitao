// Fixed hourly slots, 9am–5pm — no per-room opening-hours variation, since the
// studio's actual need is extra room time, not a general-purpose calendar.
export const SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
] as const;

// The course itself is scoped to Australia/Canberra (see the crit brief's own
// `timezone` field) — "today" has to mean the studio's today, not the
// server's UTC one.
export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Canberra" });
}

// A two-week look-ahead, not an open-ended calendar — the real annoyance this
// app targets is same-day collisions, and a booker's actual planning horizon
// for a study room is "this week or next," not months out. ISO date strings
// (YYYY-MM-DD) compare correctly as plain strings, so no Date-object
// arithmetic is needed anywhere this constant is used for a bounds check.
export const BOOKING_WINDOW_DAYS = 13;

// Adds (or subtracts) whole days to an ISO date string, done in UTC so a
// timezone's DST transition can never shift the calendar date it lands on —
// this only ever moves a date label, never a moment in time.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The single gate both the page (which date to render) and the booking API
// (which date to accept) check against, so they can never disagree about
// what's in range.
export function isBookableDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const start = today();
  return date >= start && date <= addDays(start, BOOKING_WINDOW_DAYS);
}
