import { beforeAll, describe, expect, inject, it } from "vitest";
import { bookingRow, cellTagSource } from "./cell";

// Editing a booking in place (a single UPDATE, gated the same way cancel is)
// rather than cancel-then-rebook: the point is that if the destination slot
// turns out taken, the original booking is untouched, not lost. These tests
// use dates five and ten days out — unused by any other spec file's
// hardcoded today/+3/+7 combinations, so a slot collision here can't
// silently fail a booking in a file that never changed (see booking.test.ts
// and mine.test.ts for the convention this follows).
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

// The move form for a given booker's name always follows that name in the
// rendered /mine/ HTML, same convention as mine.test.ts's cancelActionAfter.
const moveActionAfter = (html: string, bookedBy: string) => {
  const match = html.match(new RegExp(`${bookedBy}[\\s\\S]{0,600}?action="(/api/bookings/\\d+/move)"`));
  if (!match) throw new Error(`no move form found for "${bookedBy}" on /mine/`);
  return match[1];
};

describe("moving a booking", () => {
  let nearDate: string;
  let farDate: string;
  let roomId: string;

  beforeAll(async () => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Canberra" });
    const near = new Date(`${today}T00:00:00Z`);
    near.setUTCDate(near.getUTCDate() + 5);
    nearDate = near.toISOString().slice(0, 10);
    const far = new Date(`${today}T00:00:00Z`);
    far.setUTCDate(far.getUTCDate() + 10);
    farDate = far.toISOString().slice(0, 10);

    const res = await fetch(baseUrl);
    const html = await res.text();
    const match = html.match(new RegExp(cellTagSource("(\\d+)", "09:00")));
    if (!match) throw new Error("no 09:00 cell found on the home page");
    roomId = match[1];
  });

  it("moves a booking to a new date and slot, freeing the old cell and filling the new one", async () => {
    const bookedBy = `move probe ${process.hrtime.bigint()}`;

    const booked = await post("/api/bookings", new URLSearchParams({ roomId, date: nearDate, slot: "11:00", bookedBy }));
    const cookie = ownerCookie(booked);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const moveAction = moveActionAfter(await mine.text(), bookedBy);

    const moved = await post(
      moveAction,
      new URLSearchParams({ roomId, date: farDate, slot: "12:00", returnTo: "/mine/" }),
      cookie,
    );
    expect(moved.status).toBe(303);
    expect(moved.headers.get("location")).toBe("/mine/");

    const after = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const afterText = await after.text();
    expect(afterText).toContain(farDate);
    expect(afterText).not.toMatch(bookingRow(nearDate, "11:00"));

    // the old cell is free again on the grid, not just gone from /mine/
    const oldGrid = await fetch(new URL(`/?date=${nearDate}`, baseUrl));
    const oldCell = (await oldGrid.text()).match(new RegExp(`${cellTagSource(roomId, "11:00")}[\\s\\S]{0,300}`));
    expect(oldCell?.[0]).toContain("<form");

    // the new cell is booked on the grid
    const newGrid = await fetch(new URL(`/?date=${farDate}`, baseUrl));
    expect(await newGrid.text()).toContain(`Booked — ${bookedBy}`);
  });

  it("refuses to move into a slot someone else already holds, leaving both bookings intact", async () => {
    const bookedByA = `move clash A ${process.hrtime.bigint()}`;
    const bookedByB = `move clash B ${process.hrtime.bigint()}`;

    const bookedA = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: nearDate, slot: "13:00", bookedBy: bookedByA }),
    );
    const cookieA = ownerCookie(bookedA);
    await post("/api/bookings", new URLSearchParams({ roomId, date: nearDate, slot: "14:00", bookedBy: bookedByB }));

    const mineA = await fetch(new URL("/mine/", baseUrl), { headers: { cookie: cookieA } });
    const moveAction = moveActionAfter(await mineA.text(), bookedByA);

    const movingId = moveAction.match(/\/api\/bookings\/(\d+)\/move/)?.[1];
    const clash = await post(
      moveAction,
      new URLSearchParams({ roomId, date: nearDate, slot: "14:00", returnTo: "/mine/" }),
      cookieA,
    );
    expect(clash.headers.get("location")).toBe(`/mine/?error=taken&booking=${movingId}`);

    // A's booking never moved
    const mineAfter = await fetch(new URL("/mine/", baseUrl), { headers: { cookie: cookieA } });
    expect(await mineAfter.text()).toMatch(bookingRow(nearDate, "13:00"));

    // B's booking still stands, untouched by A's failed attempt
    const grid = await fetch(new URL(`/?date=${nearDate}`, baseUrl));
    expect(await grid.text()).toContain(`Booked — ${bookedByB}`);
  });

  it("attaches a move error to the booking it belongs to, not a sibling one on the same page", async () => {
    const bookedBySibling = `move sibling ${process.hrtime.bigint()}`;
    const bookedByMover = `move attribution probe ${process.hrtime.bigint()}`;

    // One owner, two bookings, so /mine/ lists more than one row — the error
    // has to land on the row that actually failed, not the other one.
    // /mine/ lists bookings ordered by date then slot, so the mover's earlier
    // slot is what puts its row — and so its alert — ahead of the sibling's.
    const moverRes = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: nearDate, slot: "09:00", bookedBy: bookedByMover }),
    );
    const cookie = ownerCookie(moverRes);
    await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: nearDate, slot: "12:00", bookedBy: bookedBySibling }),
      cookie,
    );

    const mineHtml = await (await fetch(new URL("/mine/", baseUrl), { headers: { cookie } })).text();
    const moveAction = moveActionAfter(mineHtml, bookedByMover);

    // farDate/12:00 is already occupied by the "moves a booking" test above.
    const clash = await post(
      moveAction,
      new URLSearchParams({ roomId, date: farDate, slot: "12:00", returnTo: "/mine/" }),
      cookie,
    );
    expect(clash.status).toBe(303);
    const location = clash.headers.get("location") ?? "";
    expect(location).toContain("error=taken");

    const afterHtml = await (await fetch(new URL(location, baseUrl), { headers: { cookie } })).text();
    // mine.astro renders the alert as the first child of the booking's own
    // <li>, right before that booking's name — so it lands ahead of the
    // mover's name, and the mover's name (and its whole <li>) lands ahead of
    // the sibling's, which has no alert of its own.
    const alertIndex = afterHtml.indexOf("Someone booked that slot already");
    const moverIndex = afterHtml.indexOf(bookedByMover);
    const siblingIndex = afterHtml.indexOf(bookedBySibling);
    expect(alertIndex).toBeGreaterThan(-1);
    expect(alertIndex).toBeLessThan(moverIndex);
    expect(moverIndex).toBeLessThan(siblingIndex);
    // and it only appears once — not also as a page-level banner elsewhere
    expect(afterHtml.indexOf("Someone booked that slot already", alertIndex + 1)).toBe(-1);
  });

  it("refuses to move a booking without that booking's own owner cookie", async () => {
    const bookedBy = `move guarded probe ${process.hrtime.bigint()}`;

    const booked = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: nearDate, slot: "15:00", bookedBy }),
    );
    const cookie = ownerCookie(booked);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const moveAction = moveActionAfter(await mine.text(), bookedBy);

    // no cookie at all this time — a different browser, or a replayed request
    const movingId = moveAction.match(/\/api\/bookings\/(\d+)\/move/)?.[1];
    const denied = await post(moveAction, new URLSearchParams({ roomId, date: farDate, slot: "09:00" }));
    expect(denied.headers.get("location")).toBe(`/mine/?error=missing&booking=${movingId}`);

    const mineAfter = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    expect(await mineAfter.text()).toMatch(bookingRow(nearDate, "15:00"));
  });

  it("refuses a move to a room id that doesn't exist, rather than a raw 500", async () => {
    const bookedBy = `move bogus room probe ${process.hrtime.bigint()}`;

    const booked = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: nearDate, slot: "10:00", bookedBy }),
    );
    const cookie = ownerCookie(booked);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const moveAction = moveActionAfter(await mine.text(), bookedBy);

    const movingId = moveAction.match(/\/api\/bookings\/(\d+)\/move/)?.[1];
    const rejected = await post(
      moveAction,
      new URLSearchParams({ roomId: "999999", date: farDate, slot: "09:00", returnTo: "/mine/" }),
      cookie,
    );
    expect(rejected.headers.get("location")).toBe(`/mine/?error=missing&booking=${movingId}`);

    const mineAfter = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    expect(await mineAfter.text()).toMatch(bookingRow(nearDate, "10:00"));
  });

  it("rejects a move to a date outside the two-week window, leaving the booking unchanged", async () => {
    const bookedBy = `move out of range probe ${process.hrtime.bigint()}`;

    const booked = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date: nearDate, slot: "16:00", bookedBy }),
    );
    const cookie = ownerCookie(booked);

    const mine = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    const moveAction = moveActionAfter(await mine.text(), bookedBy);

    const tooFar = new Date(`${nearDate}T00:00:00Z`);
    tooFar.setUTCDate(tooFar.getUTCDate() + 30);
    const tooFarDate = tooFar.toISOString().slice(0, 10);

    const movingId = moveAction.match(/\/api\/bookings\/(\d+)\/move/)?.[1];
    const rejected = await post(
      moveAction,
      new URLSearchParams({ roomId, date: tooFarDate, slot: "09:00", returnTo: "/mine/" }),
      cookie,
    );
    expect(rejected.headers.get("location")).toBe(`/mine/?error=date&booking=${movingId}`);

    const mineAfter = await fetch(new URL("/mine/", baseUrl), { headers: { cookie } });
    expect(await mineAfter.text()).toMatch(bookingRow(nearDate, "16:00"));
  });
});
