# Build the ANU system you wish existed

The breakthrough was noticing that a green test suite can prove a route
*works* while hiding that it's being tested for the wrong thing. My spec for
booking a future date passed on every run, because it asserted the booking
had persisted by fetching the URL I expected it to land on afterwards — not
by checking where the route's own redirect actually sent the browser. The
real bug (booking or cancelling from any day but today silently bounced you
back to today, hiding the one property this whole app exists to demonstrate)
only surfaced once I happened to click the next-day link before booking,
something eleven prior manual passes had never done. Fixing the redirect
mattered less than fixing the test: I rewrote the assertion to check the
`Location` header itself, so the same class of gap can't reopen invisibly
behind a suite that still reports green.

That's changed something specific about how I write tests now: for any route
whose job is to redirect somewhere, assert on the redirect target directly,
not on whatever state a follow-up request happens to find. It's a small
rule, but it generalises past this app — a test that checks the destination
rather than the journey will keep passing long after the journey breaks. I
also came away more willing to distrust a plausible-sounding bug report (a
subagent's TOCTOU race claim, this run) until I'd actually traced whether the
runtime could produce it — being grounded means checking the mechanism, not
just finding the shape of the argument convincing.
