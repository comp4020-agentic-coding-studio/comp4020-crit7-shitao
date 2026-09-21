import type { AstroCookies } from "astro";

export const OWNER_COOKIE = "booker";

// Not an account: a random id set in a cookie the first time a browser
// books anything, so a later cancellation can be checked against "did this
// browser make this booking" — see the comment on `bookings.ownerToken` in
// schema.ts for what this does and doesn't vouch for.
export function ownerToken(cookies: AstroCookies): string {
  const existing = cookies.get(OWNER_COOKIE)?.value;
  if (existing) return existing;
  const token = crypto.randomUUID();
  cookies.set(OWNER_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}
