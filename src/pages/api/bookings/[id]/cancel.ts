import type { APIRoute } from "astro";
import { cancelBooking } from "../../../../lib/db";
import { bus } from "../../../../lib/events";
import { OWNER_COOKIE } from "../../../../lib/owner";

// The read side of ownership: cancelling never trusts anything the form
// itself sends, only the id in the URL and the owner cookie already on the
// request — so a form built by hand (or a replayed request) can free a slot
// it didn't book only if it also happens to hold that browser's cookie.
export const POST: APIRoute = async ({ params, cookies, redirect }) => {
  const id = Number(params.id);
  const token = cookies.get(OWNER_COOKIE)?.value;

  if (!id || !token) {
    return redirect("/?error=cancel", 303);
  }

  const cancelled = cancelBooking(id, token);
  if (!cancelled) {
    return redirect("/?error=cancel", 303);
  }

  bus.emit("cancelled", cancelled);
  return redirect("/", 303);
};
