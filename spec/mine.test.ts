import { beforeAll, describe, expect, inject, it } from "vitest";
import { cellTagSource } from "./cell";

// /mine/ is the answer to "wait, what did I book and where" — the grid only
// ever shows one date, so finding your own booking otherwise means clicking
// through up to fourteen date pages. It reuses the same owner-token cookie
// the cancel button already trusts, read across the whole window instead of
// one date.
const baseUrl = inject("baseUrl");

const post = (path: string, body: URLSearchParams, cookie?: string) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, ...(cookie ? { cookie } : {}) },
    body,
    redirect: "manual",
  });

const ownerCookie = (res: Response) => {
  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/booker=[^;]+/);
  if (!match) throw new Error("no booker cookie set on the response");
  return match[0];
};

// The cancel form for a given booker's name always follows that name in the
// rendered HTML (see mine.astro's <li> layout) — this is how the tests find
// the right booking's own cancel action rather than any booking's.
const cancelActionAfter = (html: string, bookedBy: string) => {
  const match = html.match(new RegExp(`${bookedBy}[\\s\\S]{0,300}?action="(/api/bookings/\\d+/cancel)"`));
  if (!match) throw new Error(`no cancel form found for "${bookedBy}" on /mine/`);
  return match[1];
};

describe("my bookings", () => {
  let date: string;
  let futureDate: string;
  let roomId: string;

  beforeAll(async () => {
    date = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Canberra" });
    const future = new Date(`${date}T00:00:00Z`);
    future.setUTCDate(future.getUTCDate() + 3);
    futureDate = future.toISOString().slice(0, 10);

    const res = await fetch(baseUrl);
    const html = await res.text();
    const match = html.match(new RegExp(cellTagSource("(\\d+)", "09:00")));
    if (!match) throw new Error("no 09:00 cell found on the home page");
    roomId = match[1];
  });

  it("lists bookings made under one cookie across two dates, today's first", async () => {
    const bookedBy = `mine probe ${process.hrtime.bigint()}`;

    const first = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: futureDate, slot: "13:00", bookedBy }),
    );
    const cookie = ownerCookie(first);
    // 16:00 today: unused by any other spec's today-dated bookings, so this
    // can't collide and silently fail against another file's own booking.
    await post("/api/bookings", new URLSearchParams({ roomId, date, slot: "16:00", bookedBy }), cookie);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const text = await mine.text();

    const todayIndex = text.indexOf(date);
    const futureIndex = text.indexOf(futureDate, todayIndex + date.length);
    expect(todayIndex).toBeGreaterThan(-1);
    expect(futureIndex).toBeGreaterThan(todayIndex);
  });

  it("doesn't show another browser's bookings", async () => {
    const bookedBy = `mine isolation probe ${process.hrtime.bigint()}`;
    await post("/api/bookings", new URLSearchParams({ roomId, date: futureDate, slot: "14:00", bookedBy }));

    // no cookie at all this time — a stranger with no bookings of their own
    const mine = await fetch(new URL("/mine/", baseUrl));
    const text = await mine.text();
    expect(text).not.toContain(bookedBy);
  });

  it("cancelling from /mine/ frees the slot and returns to /mine/, not the grid", async () => {
    const bookedBy = `mine cancel probe ${process.hrtime.bigint()}`;
    const slot = "15:00";

    const booked = await post("/api/bookings", new URLSearchParams({ roomId, date: futureDate, slot, bookedBy }));
    const cookie = ownerCookie(booked);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const mineHtml = await mine.text();
    const cancelAction = cancelActionAfter(mineHtml, bookedBy);

    const cancelled = await post(cancelAction, new URLSearchParams({ returnTo: "/mine/" }), cookie);
    expect(cancelled.status).toBe(303);
    expect(cancelled.headers.get("location")).toBe("/mine/");

    const after = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    expect(await after.text()).not.toContain(bookedBy);

    // the slot is free again on the grid, not just gone from /mine/
    const grid = await fetch(new URL(`/?date=${futureDate}`, baseUrl));
    const gridText = await grid.text();
    const cell = gridText.match(new RegExp(`${cellTagSource(roomId, slot)}[\\s\\S]{0,300}`));
    expect(cell?.[0]).toContain("<form");
  });

  it("cancelling without a returnTo still defaults to the grid", async () => {
    const bookedBy = `mine default-return probe ${process.hrtime.bigint()}`;
    const slot = "16:00";

    const booked = await post("/api/bookings", new URLSearchParams({ roomId, date: futureDate, slot, bookedBy }));
    const cookie = ownerCookie(booked);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const cancelAction = cancelActionAfter(await mine.text(), bookedBy);

    // the grid's own cancel forms never send returnTo at all
    const cancelled = await post(cancelAction, new URLSearchParams(), cookie);
    expect(cancelled.headers.get("location")).toBe("/");
  });
});
