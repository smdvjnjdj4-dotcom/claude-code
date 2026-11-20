import "dotenv/config";
import postgres from "postgres";

if (process.env.NODE_ENV === "production") throw new Error("db:reset ist in Produktion gesperrt");
const sql = postgres(process.env.DATABASE_URL!, { onnotice: () => {} });
await sql`drop schema if exists public cascade`;
await sql`drop schema if exists drizzle cascade`;
await sql`create schema public`;
console.log("✓ Datenbank geleert");
await sql.end();
