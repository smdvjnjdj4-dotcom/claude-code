import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
/** A database handle or an open transaction – domain functions accept either. */
export type Tx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

declare global {
  // eslint-disable-next-line no-var
  var __stamplyDb: { db: DB; client: postgres.Sql } | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt (siehe .env.example)");
  const client = postgres(url, { max: Number(process.env.DB_POOL_SIZE ?? 10), onnotice: () => {} });
  return { db: drizzle(client, { schema }), client };
}

/** Lazily-created singleton (survives Next.js hot reloads in development). */
export function getDb(): DB {
  globalThis.__stamplyDb ??= create();
  return globalThis.__stamplyDb.db;
}

export async function closeDb() {
  if (globalThis.__stamplyDb) {
    await globalThis.__stamplyDb.client.end({ timeout: 5 });
    globalThis.__stamplyDb = undefined;
  }
}

export { schema };
