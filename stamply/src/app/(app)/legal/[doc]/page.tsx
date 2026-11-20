import { notFound } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import { env } from "@/lib/env";

const DOCS: Record<string, { title: string; body: React.ReactNode }> = {
  privacy: {
    title: "Datenschutzhinweise",
    body: (
      <>
        <h2>Welche Daten wir verarbeiten</h2>
        <ul>
          <li><b>Konto:</b> Name, E-Mail, Passwort (nur als scrypt-Hash).</li>
          <li><b>Treueprogramme:</b> Stempel, Belohnungen und Einlösungen bei den Geschäften, die du besuchst.</li>
          <li><b>Kassenbons:</b> Foto (Metadaten wie GPS werden entfernt), erkannter Geschäftsname, Datum, Betrag und Bon-Nummer. Kartennummern und IBANs werden vor dem Speichern unkenntlich gemacht. Das Foto wird spätestens {env.receiptRetentionDays} Tage nach der Prüfung gelöscht.</li>
          <li><b>Standort:</b> nur, wenn du ihn wählst – gerundet (~100 m) in einem Cookie auf deinem Gerät, nicht in unserer Datenbank.</li>
          <li><b>Optionale Angaben:</b> Interessen, Geburtstag (nur mit ausdrücklicher Einwilligung).</li>
          <li><b>Profilaufrufe:</b> nur als tagesbezogener, nicht rückverfolgbarer Zähler.</li>
        </ul>
        <h2>Werbliche Nachrichten</h2>
        <p>Geschäfte dürfen dir nur dann Angebote senden, wenn du für genau dieses Geschäft eingewilligt hast (Art. 6 Abs. 1 lit. a DSGVO, § 7 UWG). Jede Einwilligung und jeder Widerruf wird protokolliert. Du kannst jederzeit im Profil widerrufen.</p>
        <h2>Weitergabe</h2>
        <p>Geschäfte sehen nur Daten zu ihrem eigenen Treueprogramm (Vorname + Initial, Stempel, Besuche). Keine Weitergabe an andere Geschäfte oder Dritte.</p>
        <h2>Deine Rechte</h2>
        <p>Auskunft und Datenübertragbarkeit: „Meine Daten exportieren“ im Profil. Löschung: „Konto löschen“ im Profil. Außerdem Berichtigung, Einschränkung, Widerspruch und Beschwerde bei einer Aufsichtsbehörde.</p>
      </>
    ),
  },
  terms: {
    title: "Nutzungsbedingungen",
    body: (
      <>
        <h2>Stempel & Belohnungen</h2>
        <p>Stempel werden nur für echte Einkäufe vergeben. Jeder Beleg und jeder Code kann nur einmal verwendet werden. Manipulierte oder fremde Belege führen zum Ausschluss. Belohnungen werden vom jeweiligen Geschäft gewährt; dessen Bedingungen gelten.</p>
        <h2>Unternehmen</h2>
        <p>Unternehmen verpflichten sich, Kund:innen nur mit gültiger Einwilligung zu kontaktieren und die Bedingungen ihrer Treueprogramme fair zu gestalten. Sichtbarkeit in der Entdeckung kann nicht gekauft werden; künftige gesponserte Platzierungen werden als „Anzeige“ gekennzeichnet.</p>
      </>
    ),
  },
  imprint: {
    title: "Impressum",
    body: <p>Angaben gemäß § 5 DDG: <i>Name, Anschrift, Kontakt und ggf. Registereintrag des Betreibers hier eintragen.</i></p>,
  },
};

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={d.title} />
      <Notice tone="warning" title="Entwurf">Diese Texte sind eine technische Vorlage und müssen vor dem Livegang rechtlich geprüft und mit den Betreiberangaben ergänzt werden.</Notice>
      <article className="mt-6 space-y-3 text-[15px] leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{d.body}</article>
    </div>
  );
}
