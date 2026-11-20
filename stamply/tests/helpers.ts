import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import sharp from "sharp";
import { getDb, type DB } from "@/db";
import { businesses, users } from "@/db/schema";
import { createSession } from "@/domain/accounts";
import { createBusiness } from "@/domain/businesses";
import { createProgram, type ProgramInput } from "@/domain/programs";
import { hashPassword } from "@/lib/auth/password";
import { eq } from "drizzle-orm";

let migrated = false;

export async function freshDb(): Promise<DB> {
  const db = getDb();
  if (!migrated) {
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db, { migrationsFolder: "./drizzle" });
    migrated = true;
  }
  const tables = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  await db.execute(sql.raw(`truncate ${tables.map((t) => `"${t.tablename}"`).join(", ")} restart identity cascade`));
  return db;
}

let pwHash: string | null = null;
let seq = 0;

export async function makeUser(db: DB, type: "customer" | "business", name = `User ${++seq}`) {
  pwHash ??= await hashPassword("passwort12345");
  const [u] = await db
    .insert(users)
    .values({ name, email: `u${Date.now()}-${++seq}@test.local`, passwordHash: pwHash, accountType: type })
    .returning();
  return u;
}

export async function makeBusiness(
  db: DB,
  opts: { name?: string; plan?: "starter" | "business" | "premium"; program?: Partial<ProgramInput> } = {},
) {
  const owner = await makeUser(db, "business", "Owner");
  const b = await createBusiness(db, owner.id, {
    name: opts.name ?? `Café ${++seq}`,
    category: "cafe",
    location: { name: "Hauptfiliale", street: "Teststr. 1", postalCode: "10115", city: "Berlin", lat: 52.53, lng: 13.4 },
  });
  await db.update(businesses).set({ published: true, plan: opts.plan ?? "premium" }).where(eq(businesses.id, b.id));
  const program = await createProgram(
    db,
    owner.id,
    b.id,
    {
      name: "Kaffeekarte",
      stampsRequired: 3,
      rewardType: "free_product",
      rewardTitle: "1 Kaffee gratis",
      maxStampsPerDay: 5,
      ...opts.program,
    },
    true,
  );
  return { owner, business: { ...b, plan: opts.plan ?? "premium" }, program };
}

export async function sessionFor(db: DB, userId: string) {
  return createSession(db, userId);
}

export async function sampleImage(seed = 0) {
  return sharp({ create: { width: 64, height: 96, channels: 3, background: { r: seed % 255, g: (seed * 7) % 255, b: 200 } } })
    .png()
    .toBuffer();
}
