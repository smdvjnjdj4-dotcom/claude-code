import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { randomToken, sha256 } from "@/lib/crypto";
import { DomainError } from "@/lib/errors";
import { enforce } from "@/lib/rate-limit";

export const SESSION_TTL_DAYS = 30;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(80),
  email: z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
  password: z.string(),
  accountType: z.enum(["customer", "business"]),
});

export async function registerUser(db: Tx, input: z.input<typeof registerSchema>, ipKey = "unknown") {
  const data = registerSchema.parse(input);
  const pwProblem = passwordProblem(data.password);
  if (pwProblem) throw new DomainError("weak_password", pwProblem);
  await enforce(db, `register:${ipKey}`, 10, 3600);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${data.email}`)
    .limit(1);
  if (existing.length) {
    throw new DomainError("email_taken", "Für diese E-Mail-Adresse gibt es bereits ein Konto.");
  }
  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      accountType: data.accountType,
    })
    .returning();
  await audit(db, { actorId: user.id, action: "account.registered", meta: { type: data.accountType } });
  return user;
}

export async function authenticate(db: Tx, email: string, password: string, ipKey = "unknown"): Promise<User> {
  const normalized = email.trim().toLowerCase();
  await enforce(db, `login:ip:${ipKey}`, 30, 900);
  await enforce(db, `login:email:${normalized}`, 8, 900);
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${normalized}`).limit(1);
  // Always run the hash comparison to keep timing similar for unknown accounts.
  const ok = await verifyPassword(
    password,
    user?.passwordHash ?? "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  );
  if (!user || !ok) {
    await audit(db, { actorId: user?.id ?? null, action: "auth.login_failed" });
    throw new DomainError("invalid_credentials", "E-Mail-Adresse oder Passwort ist falsch.");
  }
  await audit(db, { actorId: user.id, action: "auth.login" });
  return user;
}

/** Creates a session and returns the plaintext token (only ever stored in the cookie). */
export async function createSession(db: Tx, userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function getSessionUser(db: Tx, token: string | undefined | null): Promise<User | null> {
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

export async function deleteSession(db: Tx, token: string) {
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export async function changePassword(db: Tx, userId: string, current: string, next: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(current, u.passwordHash))) {
    throw new DomainError("invalid_credentials", "Das aktuelle Passwort ist falsch.");
  }
  const problem = passwordProblem(next);
  if (problem) throw new DomainError("weak_password", problem);
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  // Invalidate all other sessions.
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit(db, { actorId: userId, action: "auth.password_changed" });
}
