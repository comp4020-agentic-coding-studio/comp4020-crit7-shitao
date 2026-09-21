import type { APIRoute } from "astro";
import { ownerToken } from "../../lib/owner";
import { SlotTakenError, createBooking } from "../../lib/db";
import { bus } from "../../lib/events";
import { SLOTS, isBookableDate } from "../../lib/slots";

// The write half of the booker: a plain HTML form POSTs here, the booking
// goes into SQLite (or doesn't, if the slot's already taken), and a
// successful one is broadcast to every open SSE connection. The 303 redirect
// makes the form work with no client-side JavaScript at all — the submitting
// tab re-renders from the database; every *other* tab hears about it over
// the stream.
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const roomId = Number(form.get("roomId"));
  const date = String(form.get("date") ?? "");
  const slot = String(form.get("slot") ?? "");
  const bookedBy = String(form.get("bookedBy") ?? "")
    .trim()
    .slice(0, 80);

  // The form only ever sends one of the fixed hourly slots via a hidden
  // input, but nothing stops a hand-built request sending anything else —
  // and a booking's slot/roomId end up broadcast to every other open tab
  // over SSE, so an unvalidated value here isn't just a display glitch.
  if (!roomId || !date || !slot || !bookedBy || !(SLOTS as readonly string[]).includes(slot)) {
    return redirect("/?error=missing", 303);
  }

  // The page only ever sends a date within its own two-week window via a
  // hidden input, but nothing stops a hand-built request sending any string —
  // same reasoning as the slot enum check above.
  if (!isBookableDate(date)) {
    return redirect("/?error=date", 303);
  }

  const token = ownerToken(cookies);

  try {
    const booking = createBooking({ roomId, date, slot, bookedBy, ownerToken: token });
    bus.emit("booking", booking);
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return redirect("/?error=taken", 303);
    }
    throw error;
  }

  return redirect("/", 303);
};
