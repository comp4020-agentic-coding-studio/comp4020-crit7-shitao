import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Booking, type Room, bookings, rooms } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// The studio's rooms aren't user-created — seed them once. `onConflictDoNothing`
// (backed by the `rooms.name` unique constraint) makes this idempotent across
// every boot and redeploy, so it's safe to just run it here rather than in a
// one-off script.
const ROOM_NAMES = ["Hancock GSR 1", "Hancock GSR 2", "Chifley GSR 3", "Kambri Studio 4"];
for (const name of ROOM_NAMES) {
  db.insert(rooms).values({ name }).onConflictDoNothing().run();
}

export type { Booking, Room };

export function listRooms(): Room[] {
  return db.select().from(rooms).orderBy(rooms.id).all();
}

export function listBookings(date: string): Booking[] {
  return db.select().from(bookings).where(eq(bookings.date, date)).all();
}

// Thrown when a booking loses a race for the same room/date/slot — the real
// failure mode this app exists to make visible, not a maybe.
export class SlotTakenError extends Error {}

export function createBooking(input: {
  roomId: number;
  date: string;
  slot: string;
  bookedBy: string;
}): Booking {
  try {
    return db.insert(bookings).values(input).returning().get();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new SlotTakenError(`${input.slot} on ${input.date} is already booked`);
    }
    throw error;
  }
}
