import type { Plan } from "@/db/schema";

export type Entitlements = {
  maxLocations: number;
  maxActivePrograms: number;
  maxMembers: number;
  offers: boolean;
  manualPush: boolean;
  recurringCampaigns: boolean;
  /** Ereignisbasierte Erinnerungen: fast voll, Belohnung wartet, neues Programm */
  basicAutomations: boolean;
  /** Rückgewinnung nach Inaktivität, Geburtstag */
  advancedAutomations: boolean;
  advancedStats: boolean;
  /** Max. manuelle/wiederkehrende Kampagnenläufe pro Kalendermonat */
  monthlyCampaignRuns: number;
};

export const PLANS: Record<Plan, { name: string; priceCents: number; features: string[]; e: Entitlements }> = {
  starter: {
    name: "Starter",
    priceCents: 990,
    features: ["1 Standort", "1 Treueprogramm", "Grundlegendes Dashboard", "Bonbestätigung & Stempelcodes"],
    e: {
      maxLocations: 1,
      maxActivePrograms: 1,
      maxMembers: 2,
      offers: false,
      manualPush: false,
      recurringCampaigns: false,
      basicAutomations: false,
      advancedAutomations: false,
      advancedStats: false,
      monthlyCampaignRuns: 0,
    },
  },
  business: {
    name: "Business",
    priceCents: 2490,
    features: [
      "Mehrere Treueprogramme",
      "Push-Kampagnen",
      "Automatische Erinnerungen",
      "Erweiterte Statistiken",
      "Aktionen & Angebote",
    ],
    e: {
      maxLocations: 1,
      maxActivePrograms: 5,
      maxMembers: 5,
      offers: true,
      manualPush: true,
      recurringCampaigns: true,
      basicAutomations: true,
      advancedAutomations: false,
      advancedStats: true,
      monthlyCampaignRuns: 8,
    },
  },
  premium: {
    name: "Premium",
    priceCents: 4990,
    features: [
      "Alles aus Business",
      "Mehrere Standorte (bis 10)",
      "Mitarbeiterverwaltung (bis 25)",
      "Rückgewinnung & Geburtstags-Automationen",
      "Detaillierte Analysen",
    ],
    e: {
      maxLocations: 10,
      maxActivePrograms: 20,
      maxMembers: 25,
      offers: true,
      manualPush: true,
      recurringCampaigns: true,
      basicAutomations: true,
      advancedAutomations: true,
      advancedStats: true,
      monthlyCampaignRuns: 30,
    },
  },
};

export const entitlements = (p: Plan) => PLANS[p].e;

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
