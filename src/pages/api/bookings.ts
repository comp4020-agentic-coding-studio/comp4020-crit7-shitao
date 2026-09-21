import type { APIRoute } from "astro";
import { SlotTakenError, createBooking } from "../../lib/db";
import { bus } from "../../lib/events";

// The write half of the booker: a plain HTML form POSTs here, the booking
// goes into SQLite (or doesn't, if the slot's already taken), and a
// successful one is broadcast to every open SSE connection. The 303 redirect
// makes the form work with no client-side JavaScript at all — the submitting
// tab re-renders from the database; every *other* tab hears about it over
// the stream.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const roomId = Number(form.get("roomId"));
  const date = String(form.get("date") ?? "");
  const slot = String(form.get("slot") ?? "");
  const bookedBy = String(form.get("bookedBy") ?? "")
    .trim()
    .slice(0, 80);

  if (!roomId || !date || !slot || !bookedBy) {
    return redirect("/?error=missing", 303);
  }

  try {
    const booking = createBooking({ roomId, date, slot, bookedBy });
    bus.emit("booking", booking);
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return redirect("/?error=taken", 303);
    }
    throw error;
  }

  return redirect("/", 303);
};
