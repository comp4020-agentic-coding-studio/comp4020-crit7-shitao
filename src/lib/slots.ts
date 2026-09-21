// Fixed hourly slots, 9am–5pm — deliberately no date picker yet. The studio's
// actual need is extra room time this week, not a general-purpose calendar.
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
