import type { APIRoute } from "astro";
import { cancelBooking } from "../../../../lib/db";
import { bus } from "../../../../lib/events";
import { OWNER_COOKIE } from "../../../../lib/owner";

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

  if (!id || !token) {
    return redirect(`${returnTo}?error=cancel`, 303);
  }

  const cancelled = cancelBooking(id, token);
  if (!cancelled) {
    return redirect(`${returnTo}?error=cancel`, 303);
  }

  bus.emit("cancelled", cancelled);
  return redirect(returnTo, 303);
};
