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
const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

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
    expect(res.headers.get("location")).toBe("/");

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
    expect(ok.headers.get("location")).toBe("/");

    const clash = await post(
      "/api/bookings",
      new URLSearchParams({ roomId, date, slot: clashSlot, bookedBy: second }),
    );
    expect(clash.headers.get("location")).toBe("/?error=taken");

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
});
