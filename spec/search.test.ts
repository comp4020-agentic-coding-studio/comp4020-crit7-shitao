import { beforeAll, describe, expect, it } from "vitest";
import { inject } from "vitest";
import { cellTagSource } from "./cell";

// /search/ is the answer to "is Priya's meeting still at 2pm Thursday" — the
// grid only shows one date and /mine/ only shows one browser's own bookings,
// so a cross-window name search is the only way to find someone *else's*
// booking without knowing which of fourteen date pages to check.
const baseUrl = inject("baseUrl");

const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), { method: "POST", headers: { origin: baseUrl }, body, redirect: "manual" });

describe("search", () => {
  let date: string;
  let roomId: string;

  beforeAll(async () => {
    date = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Canberra" });
    const future = new Date(`${date}T00:00:00Z`);
    // +8 days, slot 10:00: unused by any other spec file's hardcoded
    // today/+3/+5/+7/+10-day combinations (grepped first).
    future.setUTCDate(future.getUTCDate() + 8);
    date = future.toISOString().slice(0, 10);

    const res = await fetch(baseUrl);
    const html = await res.text();
    const match = html.match(new RegExp(cellTagSource("(\\d+)", "09:00")));
    if (!match) throw new Error("no 09:00 cell found on the home page");
    roomId = match[1];
  });

  it("finds a booking by a case-insensitive partial name match", async () => {
    const bookedBy = `Search Probe ${process.hrtime.bigint()}`;
    await post("/api/bookings", new URLSearchParams({ roomId, date, slot: "10:00", bookedBy }));

    const found = await fetch(new URL(`/search/?q=${encodeURIComponent("search probe")}`, baseUrl));
    const text = await found.text();
    expect(text).toContain(bookedBy);
    expect(text).toContain(date);
  });

  it("returns no results for a name nobody used", async () => {
    const res = await fetch(new URL(`/search/?q=${encodeURIComponent(`nobody-${process.hrtime.bigint()}`)}`, baseUrl));
    const text = await res.text();
    expect(text).toContain("No upcoming bookings match");
  });

  it("shows nothing for a blank query, rather than listing every booking", async () => {
    const bookedBy = `Search directory-guard probe ${process.hrtime.bigint()}`;
    await post("/api/bookings", new URLSearchParams({ roomId, date, slot: "11:00", bookedBy }));

    const blank = await fetch(new URL("/search/", baseUrl));
    const text = await blank.text();
    expect(text).not.toContain(bookedBy);
    expect(text).not.toContain("No upcoming bookings match");
  });

  it("treats a bare SQL LIKE wildcard as a literal character, not a directory-listing bypass", async () => {
    const bookedBy = `Search wildcard-guard probe ${process.hrtime.bigint()}`;
    await post("/api/bookings", new URLSearchParams({ roomId, date, slot: "12:00", bookedBy }));

    const percent = await fetch(new URL(`/search/?q=${encodeURIComponent("%")}`, baseUrl));
    const percentText = await percent.text();
    expect(percentText).not.toContain(bookedBy);

    const underscore = await fetch(new URL(`/search/?q=${encodeURIComponent("_")}`, baseUrl));
    const underscoreText = await underscore.text();
    expect(underscoreText).not.toContain(bookedBy);
  });
});
