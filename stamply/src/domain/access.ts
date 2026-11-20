import { and, eq } from "drizzle-orm";
import type { Tx } from "@/db";
import { businesses, businessMembers, users, type Business, type MemberRole } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { can, type Permission } from "@/lib/permissions";

export type MemberContext = { userId: string; businessId: string; role: MemberRole; business: Business };

/**
 * The single gate for every business-scoped operation (tenant isolation).
 * Throws unless `userId` is a member of `businessId` with a role that grants `permission`.
 */
export async function requireMember(
  db: Tx,
  userId: string,
  businessId: string,
  permission?: Permission,
): Promise<MemberContext> {
  const rows = await db
    .select({ role: businessMembers.role, business: businesses })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.businessId, businessId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new DomainError("forbidden", "Kein Zugriff auf dieses Unternehmen.");
  if (permission && !can(row.role, permission)) {
    throw new DomainError("forbidden", "Deine Rolle hat für diese Aktion keine Berechtigung.");
  }
  return { userId, businessId, role: row.role, business: row.business };
}

export async function requireCustomer(db: Tx, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new DomainError("not_found", "Konto nicht gefunden.");
  if (u.accountType !== "customer") {
    throw new DomainError("forbidden", "Diese Funktion ist nur mit einem Kundenkonto verfügbar.");
  }
  return u;
}
