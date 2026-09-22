import type { APIRoute } from "astro";
import { SlotTakenError, moveBooking } from "../../../../lib/db";
import { bus } from "../../../../lib/events";
import { OWNER_COOKIE } from "../../../../lib/owner";
import { SLOTS, isBookableDate } from "../../../../lib/slots";

// Reached only from /mine/ — the grid never needs it, since picking a
// different free cell there already is the edit. Same whitelist shape as
// cancel.ts, so a hand-built request can't turn this into an open redirect.
const RETURN_PATHS = new Set(["/", "/mine/"]);

// A moved booking is broadcast as the same "cancelled" + "booking" pair a
// cancel-then-rebook would produce, on purpose: every open tab already
// listens for both, so there's no third SSE event type to add or to keep in
// sync with a second frontend. The old cell frees, the new one fills — two
// events, not one, because they may land on two different dates/rooms that
// no single event could describe.
export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const id = Number(params.id);
  const token = cookies.get(OWNER_COOKIE)?.value;
  const form = await request.formData();
  const returnTo = RETURN_PATHS.has(String(form.get("returnTo"))) ? String(form.get("returnTo")) : "/mine/";

  const roomId = Number(form.get("roomId"));
  const date = String(form.get("date") ?? "");
  const slot = String(form.get("slot") ?? "");

  if (!id || !token || !roomId || !date || !slot || !(SLOTS as readonly string[]).includes(slot)) {
    return redirect(`${returnTo}?error=missing`, 303);
  }
  if (!isBookableDate(date)) {
    return redirect(`${returnTo}?error=date`, 303);
  }

  try {
    const moved = moveBooking(id, token, { roomId, date, slot });
    if (!moved) {
      return redirect(`${returnTo}?error=notfound`, 303);
    }
    bus.emit("cancelled", moved.previous);
    bus.emit("booking", moved.updated);
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return redirect(`${returnTo}?error=taken`, 303);
    }
    throw error;
  }

  return redirect(returnTo, 303);
};
