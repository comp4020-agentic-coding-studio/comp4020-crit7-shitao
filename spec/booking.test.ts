import { beforeAll, describe, expect, inject, it } from "vitest";

// This week's spec turned into tests: the ANU system being modelled is a
// room-booking board, so the contracts worth asserting are the ones the
// brief actually names — the core flow persists across a reload, and the
// one property that makes it worth building at all: a slot can't be
// double-booked, and the loser hears about it live over SSE, not by finding
// someone sitting in the room.
const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, body: URLSearchParams, cookie?: string) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl, ...(cookie ? { cookie } : {}) },
    body,
    redirect: "manual",
  });

// The server hands out the owner-token cookie on the Set-Cookie header of a
// booking POST; a bare fetch doesn't carry cookies between calls on its own,
// so tests that need to act "as" the same booker have to pass it through by
// hand — the same thing a browser does automatically.
const ownerCookie = (res: Response) => {
  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/booker=[^;]+/);
  if (!match) throw new Error("no booker cookie set on the response");
  return match[0];
};

describe("booking", () => {
  let date: string;
  let slot: string;
  let roomId: string;

  beforeAll(async () => {
    // a slot unlikely to collide with another describe block in this file
    date = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Canberra" });
    slot = "09:00";
    const res = await fetch(baseUrl);
    const html = await res.text();
    const match = html.match(/data-room="(\d+)" data-slot="09:00"/);
    if (!match) throw new Error("no 09:00 cell found on the home page");
    roomId = match[1];
  });

  it("books a free slot and persists it across a reload", async () => {
    const bookedBy = `spec probe ${process.hrtime.bigint()}`;
    const res = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date, slot, bookedBy }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/?date=${date}`);

    const page = await fetch(baseUrl);
    expect(await page.text()).toContain(`Booked — ${bookedBy}`);
  });

  it("refuses a second booking of the same room, date and slot", async () => {
    const first = `first ${process.hrtime.bigint()}`;
    const second = `second ${process.hrtime.bigint()}`;
    const clashSlot = "10:00";

    const ok = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date, slot: clashSlot, bookedBy: first }),
    );
    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe(`/?date=${date}`);

    const clash = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date, slot: clashSlot, bookedBy: second }),
    );
    expect(clash.headers.get("location")).toBe(`/?date=${date}&error=taken`);

    // the first booking still stands; the second never happened
    const page = await fetch(baseUrl);
    const text = await page.text();
    expect(text).toContain(`Booked — ${first}`);
    expect(text).not.toContain(`Booked — ${second}`);
  });

  it("broadcasts a new booking over the SSE stream", async () => {
    const bookedBy = `live probe ${process.hrtime.bigint()}`;
    const liveSlot = "11:00";

    // subscribe first, then post, then read until the event arrives
    const stream = await fetch(new URL("/api/events", baseUrl));
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await post("/api/bookings", new URLSearchParams({ roomId, date, slot: liveSlot, bookedBy }));

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes(bookedBy)) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain("event: booking");
    expect(received).toContain(bookedBy);
  }, 10_000);

  it("lets the booker who made a booking cancel it, freeing the slot again", async () => {
    const bookedBy = `cancel probe ${process.hrtime.bigint()}`;
    const cancelSlot = "12:00";

    const booked = await post("/api/bookings", new URLSearchParams({ roomId, date, slot: cancelSlot, bookedBy }));
    expect(booked.status).toBe(303);
    const cookie = ownerCookie(booked);

    // the owner's cookie is what makes the cancel form render at all — a
    // page view with no matching cookie never sees it
    const owned = await fetch(baseUrl, { headers: { cookie } });
    const ownedHtml = await owned.text();
    const cellMatch = ownedHtml.match(
      new RegExp(`data-room="${roomId}" data-slot="${cancelSlot}"[\\s\\S]*?action="(/api/bookings/\\d+/cancel)"`),
    );
    if (!cellMatch) throw new Error("no cancel form found for the booking's own cookie");

    const cancelled = await post(cellMatch[1], new URLSearchParams(), cookie);
    expect(cancelled.status).toBe(303);
    expect(cancelled.headers.get("location")).toBe("/");

    const page = await fetch(baseUrl);
    const text = await page.text();
    expect(text).not.toContain(`Booked — ${bookedBy}`);
    // the slot is free again, not just vacated of this booking
    const cell = text.match(new RegExp(`data-room="${roomId}" data-slot="${cancelSlot}"[\\s\\S]{0,300}`));
    expect(cell?.[0]).toContain("<form");
  });

  it("refuses to cancel a booking without that booking's own owner cookie", async () => {
    const bookedBy = `guarded probe ${process.hrtime.bigint()}`;
    const guardedSlot = "13:00";

    const booked = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date, slot: guardedSlot, bookedBy }),
    );
    const ownerCookieValue = ownerCookie(booked);

    const owned = await fetch(baseUrl, { headers: { cookie: ownerCookieValue } });
    const ownedHtml = await owned.text();
    const cellMatch = ownedHtml.match(
      new RegExp(`data-room="${roomId}" data-slot="${guardedSlot}"[\\s\\S]*?action="(/api/bookings/\\d+/cancel)"`),
    );
    if (!cellMatch) throw new Error("no cancel form found for the booking's own cookie");

    // no cookie at all this time — a different browser, or the same request
    // replayed without the owner's cookie
    const denied = await post(cellMatch[1], new URLSearchParams());
    expect(denied.headers.get("location")).toBe("/?error=cancel");

    const page = await fetch(baseUrl);
    expect(await page.text()).toContain(`Booked — ${bookedBy}`);
  });

  it("broadcasts a cancellation over the SSE stream", async () => {
    const bookedBy = `live cancel probe ${process.hrtime.bigint()}`;
    const liveSlot = "14:00";

    const booked = await post("/api/bookings", new URLSearchParams({ roomId, date, slot: liveSlot, bookedBy }));
    const cookie = ownerCookie(booked);
    const owned = await fetch(baseUrl, { headers: { cookie } });
    const ownedHtml = await owned.text();
    const cellMatch = ownedHtml.match(
      new RegExp(`data-room="${roomId}" data-slot="${liveSlot}"[\\s\\S]*?action="(/api/bookings/\\d+/cancel)"`),
    );
    if (!cellMatch) throw new Error("no cancel form found for the booking's own cookie");

    const stream = await fetch(new URL("/api/events", baseUrl));
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await post(cellMatch[1], new URLSearchParams(), cookie);

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("event: cancelled")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain("event: cancelled");
  }, 10_000);

  it("books a future date within the two-week window and shows it on that date's page", async () => {
    const bookedBy = `future probe ${process.hrtime.bigint()}`;
    const futureSlot = "15:00";
    const future = new Date(`${date}T00:00:00Z`);
    future.setUTCDate(future.getUTCDate() + 7);
    const futureDate = future.toISOString().slice(0, 10);

    const res = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: futureDate, slot: futureSlot, bookedBy }),
    );
    expect(res.status).toBe(303);
    // the redirect has to land back on the date just booked, not today's —
    // otherwise the booker who was looking at a future date gets bounced to a
    // page that shows no sign their booking worked
    expect(res.headers.get("location")).toBe(`/?date=${futureDate}`);

    const page = await fetch(new URL(`/?date=${futureDate}`, baseUrl));
    expect(await page.text()).toContain(`Booked — ${bookedBy}`);

    // today's own page is unaffected — the booking only shows on its own date
    const todayPage = await fetch(baseUrl);
    expect(await todayPage.text()).not.toContain(`Booked — ${bookedBy}`);
  });

  it("cancelling from the grid on a future date lands back on that same date", async () => {
    const bookedBy = `future cancel probe ${process.hrtime.bigint()}`;
    const futureSlot = "16:00";
    const future = new Date(`${date}T00:00:00Z`);
    future.setUTCDate(future.getUTCDate() + 8);
    const futureDate = future.toISOString().slice(0, 10);

    const booked = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: futureDate, slot: futureSlot, bookedBy }),
    );
    const cookie = ownerCookie(booked);

    const owned = await fetch(new URL(`/?date=${futureDate}`, baseUrl), { headers: { cookie } });
    const ownedHtml = await owned.text();
    const cellMatch = ownedHtml.match(
      new RegExp(`data-room="${roomId}" data-slot="${futureSlot}"[\\s\\S]*?action="(/api/bookings/\\d+/cancel)"`),
    );
    if (!cellMatch) throw new Error("no cancel form found for the booking's own cookie");

    // the grid's cancel form carries the date it's showing, same as its
    // booking form beside it — without that, cancelling bounces back to
    // today's grid instead of the date the booker was actually looking at
    const cancelled = await post(cellMatch[1], new URLSearchParams({ date: futureDate }), cookie);
    expect(cancelled.status).toBe(303);
    expect(cancelled.headers.get("location")).toBe(`/?date=${futureDate}`);

    const page = await fetch(new URL(`/?date=${futureDate}`, baseUrl));
    expect(await page.text()).not.toContain(`Booked — ${bookedBy}`);
  });

  it("refuses a booking for a date outside the two-week window", async () => {
    const bookedBy = `out of range probe ${process.hrtime.bigint()}`;
    const tooFar = new Date(`${date}T00:00:00Z`);
    tooFar.setUTCDate(tooFar.getUTCDate() + 30);
    const tooFarDate = tooFar.toISOString().slice(0, 10);

    const res = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: tooFarDate, slot: "16:00", bookedBy }),
    );
    expect(res.headers.get("location")).toBe("/?error=date");

    const page = await fetch(new URL(`/?date=${tooFarDate}`, baseUrl));
    expect(await page.text()).not.toContain(`Booked — ${bookedBy}`);
  });

  it("refuses a booking for a room id that doesn't exist, rather than a raw 500", async () => {
    const bookedBy = `bogus room probe ${process.hrtime.bigint()}`;
    const res = await post(
      "/api/bookings",
      new URLSearchParams({ roomId: "999999", date, slot, bookedBy }),
    );
    expect(res.headers.get("location")).toBe("/?error=missing");

    const page = await fetch(baseUrl);
    expect(await page.text()).not.toContain(`Booked — ${bookedBy}`);
  });

  it("falls back to today when the date query param is out of range or malformed", async () => {
    const page = await fetch(new URL("/?date=not-a-date", baseUrl));
    const text = await page.text();
    expect(text).toContain(`Room availability for ${date}`);
  });
});
