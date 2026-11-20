import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { businesses, offers, users } from "../src/db/schema";
import { registerUser } from "../src/domain/accounts";
import { createBusiness } from "../src/domain/businesses";
import { setMarketingConsent } from "../src/domain/consent";
import { awardStamps } from "../src/domain/loyalty";
import { createProgram, type ProgramInput } from "../src/domain/programs";
import { recordProfileView } from "../src/domain/discovery";

/**
 * Development seed. All businesses are flagged `is_demo` and shown with a "Demo" badge –
 * they are clearly fictitious and must never be presented as real companies.
 */
if (process.env.NODE_ENV === "production") throw new Error("Seed ist in Produktion gesperrt.");
const db = getDb();
const PASSWORD = "stamply-demo-1";

const existing = await db.select().from(users).where(sql`lower(${users.email}) = 'kunde@stamply.test'`);
if (existing.length) {
  console.log("Demo-Daten existieren bereits – übersprungen. (Neu aufsetzen: npm run db:reset)");
  await closeDb();
  process.exit(0);
}

const hours = (open: string, close: string, sunday = false) => ({
  mon: [{ open, close }], tue: [{ open, close }], wed: [{ open, close }], thu: [{ open, close }], fri: [{ open, close }],
  sat: [{ open, close }], sun: sunday ? [{ open, close }] : [],
});

type Demo = {
  name: string; category: string; description: string; street: string; city: string; postalCode: string; lat: number; lng: number;
  plan: "starter" | "business" | "premium"; program: ProgramInput; offer?: { title: string; description: string; newCustomersOnly: boolean };
  hours: ReturnType<typeof hours>; ageDays: number;
};

const demos: Demo[] = [
  { name: "Café Bohne", category: "cafe", description: "Specialty Coffee aus kleinen Röstereien, hausgemachte Zimtschnecken und ein sonniger Platz am Fenster.", street: "Torstraße 112", postalCode: "10119", city: "Berlin", lat: 52.5292, lng: 13.4011, plan: "premium",
    program: { name: "Kaffeekarte", stampsRequired: 10, rewardType: "free_product", rewardTitle: "1 Kaffee nach Wahl gratis", maxStampsPerDay: 2, minPurchaseCents: 250, eligibleItems: "Alle Heißgetränke", color: "#6C47FF" },
    offer: { title: "Erster Cappuccino 50 % günstiger", description: "Für deinen ersten Besuch mit STAMPLY.", newCustomersOnly: true }, hours: hours("07:30", "18:00", true), ageDays: 120 },
  { name: "Fade Factory Barber", category: "barber", description: "Klassische Herrenschnitte, Fades und Bartpflege – mit Termin oder einfach vorbeikommen.", street: "Oranienstraße 34", postalCode: "10999", city: "Berlin", lat: 52.5016, lng: 13.4194, plan: "business",
    program: { name: "Haarschnitt-Treue", stampsRequired: 5, rewardType: "fixed_discount", rewardTitle: "auf deinen nächsten Haarschnitt", rewardValue: 1000, color: "#111117" }, hours: hours("10:00", "20:00"), ageDays: 90 },
  { name: "Trattoria Nonna Lina", category: "restaurant", description: "Frische Pasta nach Familienrezept, Holzofenpizza und ein Tiramisu, für das man wiederkommt.", street: "Kastanienallee 21", postalCode: "10435", city: "Berlin", lat: 52.5375, lng: 13.4095, plan: "business",
    program: { name: "Stammgast-Karte", stampsRequired: 8, rewardType: "free_product", rewardTitle: "1 Dessert gratis", minPurchaseCents: 1500, color: "#E5484D" },
    offer: { title: "Aperitivo-Woche: Spritz zum halben Preis", description: "Montag bis Donnerstag ab 17 Uhr.", newCustomersOnly: false }, hours: hours("12:00", "23:00", true), ageDays: 200 },
  { name: "Nail Atelier Luna", category: "nails", description: "Maniküre, Gel und Nail-Art in ruhiger Atmosphäre. Vegane Produkte.", street: "Bergmannstraße 8", postalCode: "10961", city: "Berlin", lat: 52.4893, lng: 13.3927, plan: "premium",
    program: { name: "Nagel-Treue", stampsRequired: 6, rewardType: "percent_discount", rewardTitle: "auf deinen nächsten Termin", rewardValue: 20, color: "#D6409F" }, hours: hours("10:00", "19:00"), ageDays: 20 },
  { name: "Backstube Korn & Kruste", category: "bakery", description: "Sauerteigbrot, Franzbrötchen und Kuchen – jeden Morgen frisch aus dem Steinofen.", street: "Schönhauser Allee 140", postalCode: "10437", city: "Berlin", lat: 52.5442, lng: 13.4128, plan: "starter",
    program: { name: "Brotkarte", stampsRequired: 8, rewardType: "free_product", rewardTitle: "1 Laib Sauerteigbrot gratis", color: "#B08D57" }, hours: hours("06:30", "18:00", true), ageDays: 10 },
  { name: "Gelato Gioia", category: "icecream", description: "Handgemachtes Eis aus Bio-Milch und Früchten der Saison.", street: "Simon-Dach-Straße 15", postalCode: "10245", city: "Berlin", lat: 52.5098, lng: 13.4573, plan: "business",
    program: { name: "Kugel-Karte", stampsRequired: 7, rewardType: "free_upgrade", rewardTitle: "Gratis-Upgrade auf den großen Becher", color: "#FF6B35" }, hours: hours("12:00", "21:00", true), ageDays: 5 },
  { name: "Studio Calma Yoga", category: "fitness", description: "Vinyasa, Yin und Pilates in kleinen Gruppen. Matten vor Ort.", street: "Kollwitzstraße 50", postalCode: "10405", city: "Berlin", lat: 52.5363, lng: 13.4177, plan: "business",
    program: { name: "Yoga-Pass", stampsRequired: 10, rewardType: "free_service", rewardTitle: "1 Kursstunde gratis", color: "#12A150" }, hours: hours("07:00", "21:00", true), ageDays: 60 },
  { name: "Haarwerk Elbe", category: "hair", description: "Schnitt, Farbe und Styling mitten in Ottensen.", street: "Ottenser Hauptstraße 22", postalCode: "22765", city: "Hamburg", lat: 53.5527, lng: 9.9302, plan: "business",
    program: { name: "Haar-Treue", stampsRequired: 6, rewardType: "custom", rewardTitle: "Pflege-Kur gratis zum nächsten Schnitt", color: "#0A84FF" }, hours: hours("09:00", "19:00"), ageDays: 40 },
];

const owner = await registerUser(db, { name: "Mara Bohne", email: "cafe@stamply.test", password: PASSWORD, accountType: "business" }, crypto.randomUUID());
const otherOwner = await registerUser(db, { name: "Demo Inhaber", email: "inhaber@stamply.test", password: PASSWORD, accountType: "business" }, crypto.randomUUID());
const staff = await registerUser(db, { name: "Tom Theke", email: "team@stamply.test", password: PASSWORD, accountType: "business" }, crypto.randomUUID());
const customer = await registerUser(db, { name: "Anna Muster", email: "kunde@stamply.test", password: PASSWORD, accountType: "customer" }, crypto.randomUUID());
await db.update(users).set({ interests: ["cafe", "bakery", "nails"] }).where(eq(users.id, customer.id));

const extraCustomers = [];
for (let i = 1; i <= 14; i++) {
  extraCustomers.push(await registerUser(db, { name: `Demo Kunde ${i}`, email: `kunde${i}@stamply.test`, password: PASSWORD, accountType: "customer" }, crypto.randomUUID()));
}

const day = 86400_000;
for (const [idx, d] of demos.entries()) {
  const ownerId = idx === 0 ? owner.id : otherOwner.id;
  const b = await createBusiness(db, ownerId, {
    name: d.name, category: d.category,
    location: { name: "Hauptfiliale", street: d.street, postalCode: d.postalCode, city: d.city, lat: d.lat, lng: d.lng, openingHours: d.hours },
  });
  await db.update(businesses).set({ description: d.description, plan: d.plan, published: true, isDemo: true, createdAt: new Date(Date.now() - d.ageDays * day) }).where(eq(businesses.id, b.id));
  const p = await createProgram(db, ownerId, b.id, d.program, true);
  if (d.offer) await db.insert(offers).values({ businessId: b.id, ...d.offer });
  if (idx === 0) await db.execute(sql`insert into business_members (business_id, user_id, role) values (${b.id}, ${staff.id}, 'staff')`);

  // Realistic history: customers with stamps spread over the last weeks (one per day).
  const people = idx === 0 ? [customer, ...extraCustomers] : [customer, ...extraCustomers.slice(0, 5 + idx)].slice(0, idx % 2 ? 4 : 8);
  for (const [pi, person] of people.entries()) {
    const visits = person.id === customer.id ? (idx === 0 ? 8 : idx === 1 ? 4 : idx === 3 ? 5 : 0) : ((pi * 7 + idx * 3) % 9) + 1;
    for (let v = 0; v < visits; v++) {
      const when = new Date(Date.now() - ((visits - v) * 3 + (pi % 4)) * day - 3 * 3600_000);
      await db.transaction((tx) => awardStamps(tx, { programId: p.id, customerId: person.id, source: v % 3 ? "code" : "receipt", now: when }));
    }
    if (pi % 3 === 0) await setMarketingConsent(db, person.id, b.id, true, "seed");
    for (let k = 0; k < (pi % 5); k++) await recordProfileView(db, b.id, `seed-${person.id}-${k}`);
  }
}

console.log(`✓ Demo-Daten angelegt (${demos.length} Demo-Unternehmen).

  Kundenkonto:      kunde@stamply.test   / ${PASSWORD}
  Inhaberin Café:   cafe@stamply.test    / ${PASSWORD}   (Premium-Tarif, Testmodus)
  Mitarbeiter Café: team@stamply.test    / ${PASSWORD}
  Weitere Inhaber:  inhaber@stamply.test / ${PASSWORD}
`);
await closeDb();
