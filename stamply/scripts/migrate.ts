import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, getDb } from "../src/db";

await migrate(getDb(), { migrationsFolder: "./drizzle" });
console.log("✓ Migrationen angewendet");
await closeDb();
