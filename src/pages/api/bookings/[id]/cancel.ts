import type { APIRoute } from "astro";
import { cancelBooking } from "../../../../lib/db";
import { bus } from "../../../../lib/events";
import { OWNER_COOKIE } from "../../../../lib/owner";
import { isBookableDate } from "../../../../lib/slots";

// Cancelling can be reached from the grid (one date) or from /mine/ (every
// date at once) — an explicit whitelist, not the raw form value, decides
// where the redirect lands, so this can't be turned into an open redirect by
// a hand-built request naming some other path.
const RETURN_PATHS = new Set(["/", "/mine/"]);

// The read side of ownership: cancelling never trusts anything the form
// itself sends for *who* is cancelling, only the id in the URL and the owner
// cookie already on the request — so a form built by hand (or a replayed
// request) can free a slot it didn't book only if it also happens to hold
// that browser's cookie.
export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const id = Number(params.id);
  const token = cookies.get(OWNER_COOKIE)?.value;
  const form = await request.formData();
  const returnTo = RETURN_PATHS.has(String(form.get("returnTo"))) ? String(form.get("returnTo")) : "/";
  // The grid's cancel form (returnTo "/") is scoped to one date at a time,
  // same as the booking form beside it — without this, cancelling while
  // looking at any day but today bounced the browser back to today's grid,
  // same bug the booking route itself had until it started sending its date
  // back on redirect too. /mine/ isn't date-scoped, so it never needs this.
  const date = String(form.get("date") ?? "");
  const target = returnTo === "/" && isBookableDate(date) ? `/?date=${date}` : returnTo;

  if (!id || !token) {
    return redirect(`${target}${target.includes("?") ? "&" : "?"}error=cancel`, 303);
  }

  const cancelled = cancelBooking(id, token);
  if (!cancelled) {
    return redirect(`${target}${target.includes("?") ? "&" : "?"}error=cancel`, 303);
  }

  bus.emit("cancelled", cancelled);
  return redirect(target, 303);
};
