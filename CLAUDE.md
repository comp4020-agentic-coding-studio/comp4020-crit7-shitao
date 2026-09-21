# Working rules for this repo

- `src/lib/schema.ts` is the database's ground truth. Change it there, run
  `pnpm db:generate`, and commit the migration in the same commit as the
  schema edit — never hand-edit `drizzle/` or the SQLite file directly.
- The whole point of this app is that a slot can't be double-booked. Any fix
  to a booking bug has to hold at the database level (a constraint the
  database itself enforces), not just in the form the browser happens to
  render — the UI is a suggestion, the constraint is the guarantee.
- Keep `spec/*.test.ts` testing contracts (what a route must do for anyone
  calling it), not implementation. If a test only passes for one specific
  way of writing the handler, rewrite the test, not just the code.
- Before calling anything done, actually load the page in a real browser at
  both marking viewports (1920×1080, 390×844) and drive the booking flow —
  a green `pnpm check` proves the routes respond, not that the grid is
  usable or that the layout survives a narrow screen.
- Commit small and often: a schema change, a route change and a content
  change are separate commits even within one session.
