import path from "node:path";
import * as schema from "./schema";

async function createDb() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const sql = neon(process.env.DATABASE_URL);
    return drizzle(sql, { schema });
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  const client = new PGlite(path.join(process.cwd(), ".pglite-data"));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "src/db/migrations") });
  return db;
}

declare global {
  // eslint-disable-next-line no-var
  var __dbPromise: ReturnType<typeof createDb> | undefined;
}

export function getDb() {
  if (!global.__dbPromise) {
    global.__dbPromise = createDb();
  }
  return global.__dbPromise;
}
