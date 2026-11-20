import type { MemberRole } from "@/db/schema";

export const PERMISSIONS = [
  "business.edit",
  "programs.manage",
  "offers.manage",
  "receipts.review",
  "stamps.issue",
  "rewards.redeem",
  "customers.view",
  "campaigns.manage",
  "stats.view",
  "team.manage",
  "billing.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<MemberRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: [
    "business.edit",
    "programs.manage",
    "offers.manage",
    "receipts.review",
    "stamps.issue",
    "rewards.redeem",
    "customers.view",
    "campaigns.manage",
    "stats.view",
  ],
  // Mitarbeiter an der Theke: Stempel vergeben, Bons prüfen, Belohnungen einlösen.
  staff: ["receipts.review", "stamps.issue", "rewards.redeem"],
};

export function can(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Inhaber:in",
  manager: "Manager:in",
  staff: "Mitarbeiter:in",
};
