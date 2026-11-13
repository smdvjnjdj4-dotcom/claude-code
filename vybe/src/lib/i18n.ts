import { useVybe } from '@/store/useVybe';
import type { Attribute, Difficulty, Lang } from '@/domain/types';

const de = {
  'app.tagline': 'Your Life. Your Universe.',
  'nav.home': 'Home', 'nav.missions': 'Missionen', 'nav.habits': 'Habits', 'nav.money': 'Geld', 'nav.more': 'Mehr',
  'nav.character': 'Charakter', 'nav.achievements': 'Erfolge', 'nav.social': 'Social', 'nav.companion': 'Companion', 'nav.stats': 'Statistik', 'nav.settings': 'Einstellungen',
  'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.delete': 'Löschen', 'common.edit': 'Bearbeiten', 'common.add': 'Hinzufügen', 'common.close': 'Schließen',
  'common.back': 'Zurück', 'common.next': 'Weiter', 'common.done': 'Fertig', 'common.today': 'Heute', 'common.yesterday': 'Gestern', 'common.all': 'Alle', 'common.confirm': 'Bestätigen',
  'common.demo': 'Demo', 'common.level': 'Level', 'common.xp': 'XP', 'common.days': 'Tage', 'common.weeks': 'Wochen', 'common.of': 'von', 'common.required': 'Pflichtfeld', 'common.optional': 'optional',
  'common.seeAll': 'Alle ansehen', 'common.undo': 'Rückgängig', 'common.areYouSure': 'Bist du sicher?',
  'attr.discipline': 'Disziplin', 'attr.intelligence': 'Intelligenz', 'attr.fitness': 'Fitness', 'attr.finance': 'Finanzen', 'attr.creativity': 'Kreativität', 'attr.social': 'Soziales',
  'diff.easy': 'Leicht', 'diff.normal': 'Normal', 'diff.challenging': 'Fordernd', 'diff.hard': 'Schwer', 'diff.epic': 'Episch',
  'rarity.common': 'Gewöhnlich', 'rarity.rare': 'Selten', 'rarity.epic': 'Episch', 'rarity.legendary': 'Legendär',
  // onboarding
  'ob.welcome.title': 'Willkommen bei VYBE', 'ob.welcome.text': 'Verwandle deinen Alltag in echten Fortschritt. Missionen, Gewohnheiten, Finanzen – alles zahlt auf deinen Charakter ein.',
  'ob.start': 'Los geht’s', 'ob.demo': 'Mit Demo-Profil erkunden', 'ob.step': 'Schritt',
  'ob.name.title': 'Wie heißt du?', 'ob.name.hint': 'So begrüßt dich VYBE jeden Tag.', 'ob.name.placeholder': 'Dein Vorname',
  'ob.goals.title': 'Was sind deine größten Ziele?', 'ob.goals.hint': 'Wähle Vorschläge oder schreib eigene. Bis zu 5.', 'ob.goals.placeholder': 'Eigenes Ziel hinzufügen…',
  'ob.areas.title': 'Welche Lebensbereiche willst du stärken?', 'ob.areas.hint': 'Daraus entstehen deine Startmissionen.',
  'ob.time.title': 'Wie viel Zeit kannst du täglich investieren?', 'ob.time.hint': 'Ehrlich ist besser als ehrgeizig. Du kannst es jederzeit ändern.',
  'ob.motivation.title': 'Was motiviert dich?', 'ob.motivation.hint': 'Hilft deinem Companion, den richtigen Ton zu treffen.',
  'ob.finish.title': 'Dein Universum ist bereit', 'ob.finish.text': 'Wir haben {missions} Startmissionen und {habits} Gewohnheiten für dich vorbereitet.', 'ob.finish.cta': 'Zum Command Center',
  'ob.min': 'Min.', 'ob.err.name': 'Bitte gib einen Namen ein (max. 30 Zeichen).', 'ob.err.areas': 'Wähle mindestens einen Bereich.',
  'goal.s1': 'Fitter werden', 'goal.s2': 'Mehr lesen', 'goal.s3': 'Geld sparen', 'goal.s4': 'Besser schlafen', 'goal.s5': 'Neue Fähigkeit lernen', 'goal.s6': 'Mehr Zeit mit Freunden', 'goal.s7': 'Weniger Bildschirmzeit', 'goal.s8': 'Kreatives Projekt starten',
  'mot.growth': 'Persönliches Wachstum', 'mot.health': 'Gesundheit', 'mot.freedom': 'Finanzielle Freiheit', 'mot.recognition': 'Anerkennung', 'mot.curiosity': 'Neugier', 'mot.people': 'Menschen, die mir wichtig sind', 'mot.competition': 'Wettbewerb', 'mot.calm': 'Innere Ruhe',
  // home
  'home.morning': 'Guten Morgen', 'home.afternoon': 'Guten Tag', 'home.evening': 'Guten Abend', 'home.night': 'Gute Nacht',
  'home.dailyProgress': 'Tagesfortschritt', 'home.streak': 'Serie', 'home.freezes': 'Freezes', 'home.todayMissions': 'Heutige Missionen', 'home.todayHabits': 'Heutige Gewohnheiten',
  'home.week': 'Diese Woche', 'home.quick': 'Schnellaktionen', 'home.qa.mission': 'Mission', 'home.qa.expense': 'Ausgabe', 'home.qa.habit': 'Habit', 'home.qa.ask': 'Fragen',
  'home.toNext': '{xp} XP bis Level {level}', 'home.allDone': 'Alles erledigt für heute. Erholung ist auch Fortschritt.', 'home.xpToday': 'XP heute',
  'home.demoBanner': 'Demo-Profil mit Beispieldaten. Setze es in den Einstellungen zurück, um mit deinem eigenen Profil zu starten.', 'home.demoReset': 'Eigenes Profil starten',
  'home.noMissions': 'Keine Missionen für heute', 'home.noMissionsText': 'Erstelle eine Mission oder lass dir vom Companion einen Tagesplan vorschlagen.',
  'home.noHabits': 'Noch keine Gewohnheiten', 'home.noHabitsText': 'Kleine tägliche Routinen sind der stärkste Hebel.',
  'home.capNote': 'Ab {cap} XP am Tag halbieren sich Belohnungen. Pausen sind Teil des Spiels.',
  // missions
  'm.title': 'Missionen', 'm.new': 'Neue Mission', 'm.edit': 'Mission bearbeiten', 'm.name': 'Titel', 'm.note': 'Notiz', 'm.attribute': 'Attribut', 'm.difficulty': 'Schwierigkeit',
  'm.recurrence': 'Wiederholung', 'm.once': 'Einmalig', 'm.daily': 'Täglich', 'm.target': 'Schritte', 'm.targetHint': 'Mehrere Schritte, z. B. 4 Gläser Wasser', 'm.reward': 'Belohnung',
  'm.filter.open': 'Offen', 'm.filter.done': 'Erledigt', 'm.empty': 'Hier ist es ruhig', 'm.emptyText': 'Erstelle deine erste Mission – klein anfangen zählt.',
  'm.err.title': 'Titel braucht 2–80 Zeichen.', 'm.saved': 'Mission gespeichert', 'm.deleted': 'Mission gelöscht', 'm.deleteHint': 'Bereits verdiente XP bleiben erhalten.',
  'm.completed': 'Erledigt', 'm.rules': 'XP-Regeln', 'm.rulesText': 'Leicht 20 · Normal 30 · Fordernd 40 · Schwer 60 · Episch 100 XP. Das Attribut der Mission wächst um denselben Wert. Jede Mission belohnt nur einmal pro Tag.',
  'm.placeholder': 'z. B. 20 Minuten lesen', 'm.carry': 'Offen seit {date}', 'm.ai': 'Vom Companion',
  // habits
  'h.title': 'Gewohnheiten', 'h.new': 'Neue Gewohnheit', 'h.edit': 'Gewohnheit bearbeiten', 'h.name': 'Name', 'h.icon': 'Symbol', 'h.color': 'Farbe', 'h.weekly': 'Ziel pro Woche', 'h.perWeek': '×/Woche', 'h.everyDay': 'Täglich',
  'h.reminder': 'Erinnerung', 'h.reminderHint': 'Funktioniert, solange VYBE geöffnet ist (Push im Hintergrund benötigt ein Backend).', 'h.streak': 'Serie', 'h.best': 'Rekord', 'h.rate': '30-Tage-Quote', 'h.thisWeek': 'Diese Woche',
  'h.heatmap': 'Aktivität', 'h.empty': 'Noch keine Gewohnheiten', 'h.emptyText': 'Starte mit einer Gewohnheit, die so leicht ist, dass du nicht Nein sagen kannst.', 'h.err.name': 'Name braucht 2–40 Zeichen.',
  'h.milestones': 'Meilensteine', 'h.saved': 'Gewohnheit gespeichert', 'h.deleted': 'Gewohnheit gelöscht', 'h.stats': 'Statistik', 'h.chart': 'Abschlüsse (8 Wochen)', 'h.tapHint': 'Tippe auf einen Tag, um ihn nachzutragen.',
  'h.pastNoXp': 'Nachgetragen', 'h.overview': 'Übersicht', 'h.totalLogs': 'Einträge gesamt',
  // money
  'f.title': 'Money Hub', 'f.balance': 'Saldo diesen Monat', 'f.income': 'Einnahmen', 'f.expense': 'Ausgaben', 'f.add': 'Buchung', 'f.addIncome': 'Einnahme', 'f.addExpense': 'Ausgabe',
  'f.amount': 'Betrag', 'f.category': 'Kategorie', 'f.note': 'Notiz', 'f.date': 'Datum', 'f.currency': 'Währung', 'f.budgets': 'Monatsbudgets', 'f.goals': 'Sparziele', 'f.distribution': 'Ausgabenverteilung',
  'f.transactions': 'Buchungen', 'f.insights': 'Monats-Insights', 'f.noTx': 'Noch keine Buchungen', 'f.noTxText': 'Erfasse Einnahmen und Ausgaben manuell – kein Bankzugang nötig.',
  'f.manual': 'Manuell', 'f.connected': 'Verbunden', 'f.demoData': 'Demo', 'f.manualNote': 'Alle Daten sind manuell erfasst und bleiben auf deinem Gerät. Bankanbindung ist nicht Teil dieser Version.',
  'f.err.amount': 'Gib einen gültigen Betrag ein, z. B. 12,50.', 'f.err.name': 'Name braucht 2–40 Zeichen.', 'f.saved': 'Buchung gespeichert (+XP einmal täglich)',
  'f.newBudget': 'Budget festlegen', 'f.limit': 'Limit / Monat', 'f.spent': 'ausgegeben', 'f.left': 'übrig', 'f.over': 'überschritten', 'f.noBudgets': 'Lege Budgets fest, um deine Ausgaben im Blick zu behalten.',
  'f.newGoal': 'Neues Sparziel', 'f.goalName': 'Name', 'f.goalTarget': 'Zielbetrag', 'f.deadline': 'Zieldatum', 'f.deposit': 'Einzahlen', 'f.withdraw': 'Entnehmen', 'f.noGoals': 'Ein klares Ziel macht Sparen leichter.',
  'f.otherCurrency': '{n} Buchung(en) in anderer Währung sind nicht im Saldo enthalten (keine Umrechnung).', 'f.month': 'Monat',
  'f.ins.top': 'Größter Ausgabenposten: {cat} ({amount}).', 'f.ins.rate': 'Sparquote diesen Monat: {rate} %.', 'f.ins.vsLast': 'Ausgaben {dir} {pct} % gegenüber Vormonat.', 'f.ins.up': 'gestiegen um', 'f.ins.down': 'gesunken um',
  'f.ins.budget': '{n} Budget(s) überschritten.', 'f.ins.none': 'Erfasse ein paar Buchungen, dann erscheinen hier Insights.', 'f.contributeTitle': 'Betrag für „{name}“',
  'cat.housing': 'Wohnen', 'cat.food': 'Essen', 'cat.transport': 'Mobilität', 'cat.leisure': 'Freizeit', 'cat.shopping': 'Shopping', 'cat.health': 'Gesundheit', 'cat.subscriptions': 'Abos', 'cat.education': 'Bildung', 'cat.other': 'Sonstiges',
  'cat.salary': 'Gehalt', 'cat.side': 'Nebeneinkommen', 'cat.gift': 'Geschenk', 'cat.refund': 'Erstattung', 'cat.other_income': 'Sonstiges',
  // character
  'c.title': 'Charakter', 'c.attributes': 'Attribute', 'c.rank': 'Rang', 'c.auras': 'Auren', 'c.aurasHint': 'Schalte neue Auren mit steigendem Level frei. Sie färben VYBE ein.', 'c.unlockAt': 'Ab Level {level}',
  'c.active': 'Aktiv', 'c.history': 'Fortschrittsverlauf', 'c.howTo': 'So wächst {attr}', 'c.howToText': 'Missionen und Gewohnheiten mit diesem Attribut geben XP.',
  'aura.violet': 'Violett', 'aura.cyan': 'Cyan', 'aura.aurora': 'Aurora', 'aura.solar': 'Solar', 'aura.nebula': 'Nebula',
  // achievements
  'a.title': 'Erfolge', 'a.unlocked': 'freigeschaltet', 'a.locked': 'Noch gesperrt', 'a.unlockedOn': 'Freigeschaltet am {date}', 'a.bonus': '+{xp} XP Bonus', 'a.new': 'Erfolg freigeschaltet!', 'a.share': 'Teilen',
  'a.shareText': 'Ich habe in VYBE den Erfolg „{title}“ freigeschaltet!', 'a.copied': 'In die Zwischenablage kopiert',
  // level
  'lvl.up': 'Level Up!', 'lvl.reached': 'Du hast Level {level} erreicht', 'lvl.continue': 'Weiter',
  // stats
  's.title': 'Statistik', 's.xp14': 'XP der letzten 14 Tage', 's.byAttr': 'XP nach Attribut', 's.history': 'Verlauf', 's.totalXp': 'Gesamt-XP', 's.bestStreak': 'Längste Serie', 's.activeDays': 'Aktive Tage',
  's.missionsDone': 'Missionen erledigt', 's.empty': 'Noch kein Verlauf – deine erste erledigte Mission erscheint hier.', 's.achievement': 'Erfolg', 's.moneyTrack': 'Finanzen erfasst', 's.moneySave': 'Gespart',
  // companion
  'ai.title': 'Companion', 'ai.demoMode': 'Demo-Modus', 'ai.demoExplain': 'Antworten kommen aus lokalen Regeln und deinen echten VYBE-Daten – keine KI. Verbinde ein Backend in den Einstellungen für echte KI-Antworten.',
  'ai.live': 'Live-KI', 'ai.placeholder': 'Frag deinen Companion…', 'ai.send': 'Senden', 'ai.thinking': 'Denkt nach…', 'ai.clear': 'Verlauf löschen',
  'ai.s.plan': 'Plane meinen Tag', 'ai.s.break': 'Zerlege mein Ziel', 'ai.s.reflect': 'Wie lief meine Woche?', 'ai.s.focus': 'Tipps für mehr Fokus',
  'ai.proposal': 'Vorschlag', 'ai.accept': 'Übernehmen', 'ai.dismiss': 'Verwerfen', 'ai.accepted': 'Übernommen', 'ai.dismissed': 'Verworfen', 'ai.acceptAll': 'Alle übernehmen',
  'ai.confirmNote': 'Vorschläge ändern nichts, bis du sie bestätigst.', 'ai.error': 'Der Companion ist gerade nicht erreichbar. Antwort im Demo-Modus:', 'ai.empty': 'Wobei kann ich helfen?', 'ai.emptyText': 'Ich plane mit dir den Tag, zerlege Ziele in Missionen und reflektiere deinen Fortschritt.',
  // social
  'so.title': 'Social', 'so.challenges': 'Challenges', 'so.friends': 'Freunde', 'so.groups': 'Gruppen', 'so.join': 'Beitreten', 'so.leave': 'Verlassen', 'so.joined': 'Dabei',
  'so.demoNote': 'Demo: Teilnehmende sind simuliert und als Demo markiert. Online-Multiplayer ist für eine spätere Version vorbereitet.', 'so.you': 'Du', 'so.daysLeft': 'noch {n} Tage', 'so.ended': 'Beendet', 'so.progress': '{n} von {goal} Tagen',
  'so.newChallenge': 'Eigene Challenge', 'so.chTitle': 'Titel', 'so.chDays': 'Ziel-Tage', 'so.chLength': 'Dauer (Tage)', 'so.addFriend': 'Freund hinzufügen', 'so.friendName': 'Name',
  'so.localFriend': 'Lokaler Kontakt – noch keine Synchronisation', 'so.noFriends': 'Füge Kontakte hinzu, um Gruppen zu bilden. Sie bleiben lokal, bis ein Online-Backend verfügbar ist.',
  'so.newGroup': 'Private Gruppe', 'so.groupName': 'Gruppenname', 'so.members': 'Mitglieder', 'so.noGroups': 'Noch keine Gruppen.', 'so.compare': 'Vergleich', 'so.share': 'Fortschritt teilen',
  'so.shareText': 'Ich bin in VYBE auf Level {level} mit einer {streak}-Tage-Serie! ✨', 'so.err.title': 'Titel braucht 2–60 Zeichen.', 'so.demoTag': 'Demo', 'so.localTag': 'Lokal',
  // settings
  'set.title': 'Einstellungen', 'set.profile': 'Profil', 'set.name': 'Name', 'set.dailyTime': 'Tägliche Zeit', 'set.appearance': 'Darstellung', 'set.theme': 'Theme', 'set.dark': 'Dunkel', 'set.light': 'Hell', 'set.system': 'System',
  'set.accent': 'Akzent-Aura', 'set.language': 'Sprache', 'set.notifications': 'Benachrichtigungen', 'set.notifEnable': 'Benachrichtigungen erlauben', 'set.notifHabits': 'Habit-Erinnerungen', 'set.notifPlan': 'Tagesplan-Erinnerung',
  'set.notifDenied': 'Benachrichtigungen wurden im Browser blockiert.', 'set.notifUnsupported': 'Dieser Browser unterstützt keine Benachrichtigungen.', 'set.notifNote': 'Erinnerungen werden lokal ausgelöst, solange VYBE geöffnet ist.',
  'set.privacy': 'Privatsphäre', 'set.localOnly': 'Alle Daten bleiben lokal auf diesem Gerät (IndexedDB). Kein Tracking, keine Analytics.', 'set.hideAmounts': 'Beträge verbergen', 'set.shareActivity': 'Aktivität mit Freunden teilen (wenn Sync verfügbar)',
  'set.data': 'Daten', 'set.export': 'Daten exportieren (JSON)', 'set.import': 'Daten importieren', 'set.imported': 'Import erfolgreich', 'set.importErr': 'Import fehlgeschlagen: Datei ist kein gültiger VYBE-Export.',
  'set.reset': 'Alle Daten löschen', 'set.resetText': 'Löscht Profil, Missionen, Gewohnheiten, Finanzen und Fortschritt unwiderruflich von diesem Gerät.', 'set.resetConfirm': 'Tippe LÖSCHEN zur Bestätigung', 'set.resetWord': 'LÖSCHEN', 'set.resetDone': 'Alle Daten gelöscht',
  'set.access': 'Barrierefreiheit', 'set.motion': 'Bewegung', 'set.motionReduced': 'Reduziert', 'set.motionFull': 'Voll', 'set.largeText': 'Größere Schrift', 'set.contrast': 'Hoher Kontrast',
  'set.ai': 'KI-Backend', 'set.aiEndpoint': 'Endpoint-URL', 'set.aiHint': 'Relative URL deines eigenen Proxys (siehe README). API-Keys gehören nie ins Frontend.', 'set.aiTest': 'Verbindung testen', 'set.aiOk': 'Backend erreichbar – Live-KI aktiv', 'set.aiFail': 'Nicht erreichbar – Demo-Modus aktiv',
  'set.currency': 'Basiswährung', 'set.about': 'Über VYBE', 'set.version': 'Version', 'set.restartDemo': 'Demo neu laden', 'set.saved': 'Gespeichert',
  'err.title': 'Etwas ist schiefgelaufen', 'err.text': 'Dieser Bereich konnte nicht geladen werden. Deine Daten sind sicher.', 'err.retry': 'Neu laden',
  'reward.label.track': 'Finanzen erfasst', 'reward.label.save': 'Gespart',
};

export type TKey = keyof typeof de;

const en: Record<TKey, string> = {
  'app.tagline': 'Your Life. Your Universe.',
  'nav.home': 'Home', 'nav.missions': 'Missions', 'nav.habits': 'Habits', 'nav.money': 'Money', 'nav.more': 'More',
  'nav.character': 'Character', 'nav.achievements': 'Achievements', 'nav.social': 'Social', 'nav.companion': 'Companion', 'nav.stats': 'Statistics', 'nav.settings': 'Settings',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit', 'common.add': 'Add', 'common.close': 'Close',
  'common.back': 'Back', 'common.next': 'Next', 'common.done': 'Done', 'common.today': 'Today', 'common.yesterday': 'Yesterday', 'common.all': 'All', 'common.confirm': 'Confirm',
  'common.demo': 'Demo', 'common.level': 'Level', 'common.xp': 'XP', 'common.days': 'days', 'common.weeks': 'weeks', 'common.of': 'of', 'common.required': 'Required', 'common.optional': 'optional',
  'common.seeAll': 'See all', 'common.undo': 'Undo', 'common.areYouSure': 'Are you sure?',
  'attr.discipline': 'Discipline', 'attr.intelligence': 'Intelligence', 'attr.fitness': 'Fitness', 'attr.finance': 'Finance', 'attr.creativity': 'Creativity', 'attr.social': 'Social',
  'diff.easy': 'Easy', 'diff.normal': 'Normal', 'diff.challenging': 'Challenging', 'diff.hard': 'Hard', 'diff.epic': 'Epic',
  'rarity.common': 'Common', 'rarity.rare': 'Rare', 'rarity.epic': 'Epic', 'rarity.legendary': 'Legendary',
  'ob.welcome.title': 'Welcome to VYBE', 'ob.welcome.text': 'Turn everyday life into real progress. Missions, habits, money — everything levels up your character.',
  'ob.start': "Let's go", 'ob.demo': 'Explore with a demo profile', 'ob.step': 'Step',
  'ob.name.title': "What's your name?", 'ob.name.hint': 'VYBE will greet you with it every day.', 'ob.name.placeholder': 'Your first name',
  'ob.goals.title': 'What are your biggest goals?', 'ob.goals.hint': 'Pick suggestions or write your own. Up to 5.', 'ob.goals.placeholder': 'Add your own goal…',
  'ob.areas.title': 'Which areas of life do you want to improve?', 'ob.areas.hint': 'Your starter missions are built from these.',
  'ob.time.title': 'How much time can you invest daily?', 'ob.time.hint': 'Honest beats ambitious. You can change it anytime.',
  'ob.motivation.title': 'What motivates you?', 'ob.motivation.hint': 'Helps your companion strike the right tone.',
  'ob.finish.title': 'Your universe is ready', 'ob.finish.text': 'We prepared {missions} starter missions and {habits} habits for you.', 'ob.finish.cta': 'Open Command Center',
  'ob.min': 'min', 'ob.err.name': 'Please enter a name (max 30 characters).', 'ob.err.areas': 'Pick at least one area.',
  'goal.s1': 'Get fitter', 'goal.s2': 'Read more', 'goal.s3': 'Save money', 'goal.s4': 'Sleep better', 'goal.s5': 'Learn a new skill', 'goal.s6': 'More time with friends', 'goal.s7': 'Less screen time', 'goal.s8': 'Start a creative project',
  'mot.growth': 'Personal growth', 'mot.health': 'Health', 'mot.freedom': 'Financial freedom', 'mot.recognition': 'Recognition', 'mot.curiosity': 'Curiosity', 'mot.people': 'People I care about', 'mot.competition': 'Competition', 'mot.calm': 'Inner calm',
  'home.morning': 'Good morning', 'home.afternoon': 'Good afternoon', 'home.evening': 'Good evening', 'home.night': 'Good night',
  'home.dailyProgress': 'Daily progress', 'home.streak': 'Streak', 'home.freezes': 'Freezes', 'home.todayMissions': "Today's missions", 'home.todayHabits': "Today's habits",
  'home.week': 'This week', 'home.quick': 'Quick actions', 'home.qa.mission': 'Mission', 'home.qa.expense': 'Expense', 'home.qa.habit': 'Habit', 'home.qa.ask': 'Ask',
  'home.toNext': '{xp} XP to level {level}', 'home.allDone': 'All done for today. Rest is progress, too.', 'home.xpToday': 'XP today',
  'home.demoBanner': 'Demo profile with sample data. Reset it in Settings to start with your own profile.', 'home.demoReset': 'Start my own profile',
  'home.noMissions': 'No missions for today', 'home.noMissionsText': 'Create a mission or let the companion suggest a plan for your day.',
  'home.noHabits': 'No habits yet', 'home.noHabitsText': 'Small daily routines are the strongest lever.',
  'home.capNote': 'Beyond {cap} XP per day, rewards are halved. Breaks are part of the game.',
  'm.title': 'Missions', 'm.new': 'New mission', 'm.edit': 'Edit mission', 'm.name': 'Title', 'm.note': 'Note', 'm.attribute': 'Attribute', 'm.difficulty': 'Difficulty',
  'm.recurrence': 'Repeat', 'm.once': 'Once', 'm.daily': 'Daily', 'm.target': 'Steps', 'm.targetHint': 'Multiple steps, e.g. 4 glasses of water', 'm.reward': 'Reward',
  'm.filter.open': 'Open', 'm.filter.done': 'Done', 'm.empty': "It's quiet here", 'm.emptyText': 'Create your first mission — starting small counts.',
  'm.err.title': 'Title needs 2–80 characters.', 'm.saved': 'Mission saved', 'm.deleted': 'Mission deleted', 'm.deleteHint': 'XP you already earned is kept.',
  'm.completed': 'Completed', 'm.rules': 'XP rules', 'm.rulesText': 'Easy 20 · Normal 30 · Challenging 40 · Hard 60 · Epic 100 XP. The mission’s attribute grows by the same amount. Each mission rewards only once per day.',
  'm.placeholder': 'e.g. Read for 20 minutes', 'm.carry': 'Open since {date}', 'm.ai': 'From companion',
  'h.title': 'Habits', 'h.new': 'New habit', 'h.edit': 'Edit habit', 'h.name': 'Name', 'h.icon': 'Icon', 'h.color': 'Color', 'h.weekly': 'Weekly goal', 'h.perWeek': '×/week', 'h.everyDay': 'Daily',
  'h.reminder': 'Reminder', 'h.reminderHint': 'Works while VYBE is open (background push needs a backend).', 'h.streak': 'Streak', 'h.best': 'Best', 'h.rate': '30-day rate', 'h.thisWeek': 'This week',
  'h.heatmap': 'Activity', 'h.empty': 'No habits yet', 'h.emptyText': "Start with a habit so easy you can't say no.", 'h.err.name': 'Name needs 2–40 characters.',
  'h.milestones': 'Milestones', 'h.saved': 'Habit saved', 'h.deleted': 'Habit deleted', 'h.stats': 'Statistics', 'h.chart': 'Completions (8 weeks)', 'h.tapHint': 'Tap a day to log it retroactively.',
  'h.pastNoXp': 'Logged later', 'h.overview': 'Overview', 'h.totalLogs': 'Total check-ins',
  'f.title': 'Money Hub', 'f.balance': 'Balance this month', 'f.income': 'Income', 'f.expense': 'Expenses', 'f.add': 'Entry', 'f.addIncome': 'Income', 'f.addExpense': 'Expense',
  'f.amount': 'Amount', 'f.category': 'Category', 'f.note': 'Note', 'f.date': 'Date', 'f.currency': 'Currency', 'f.budgets': 'Monthly budgets', 'f.goals': 'Savings goals', 'f.distribution': 'Spending distribution',
  'f.transactions': 'Transactions', 'f.insights': 'Monthly insights', 'f.noTx': 'No transactions yet', 'f.noTxText': 'Log income and expenses manually — no bank access needed.',
  'f.manual': 'Manual', 'f.connected': 'Connected', 'f.demoData': 'Demo', 'f.manualNote': 'All data is entered manually and stays on your device. Bank sync is not part of this version.',
  'f.err.amount': 'Enter a valid amount, e.g. 12.50.', 'f.err.name': 'Name needs 2–40 characters.', 'f.saved': 'Transaction saved (+XP once per day)',
  'f.newBudget': 'Set budget', 'f.limit': 'Limit / month', 'f.spent': 'spent', 'f.left': 'left', 'f.over': 'over', 'f.noBudgets': 'Set budgets to keep spending in view.',
  'f.newGoal': 'New savings goal', 'f.goalName': 'Name', 'f.goalTarget': 'Target amount', 'f.deadline': 'Target date', 'f.deposit': 'Deposit', 'f.withdraw': 'Withdraw', 'f.noGoals': 'A clear goal makes saving easier.',
  'f.otherCurrency': '{n} transaction(s) in another currency are not included in the balance (no conversion).', 'f.month': 'Month',
  'f.ins.top': 'Biggest spending category: {cat} ({amount}).', 'f.ins.rate': 'Savings rate this month: {rate}%.', 'f.ins.vsLast': 'Spending {dir} {pct}% vs. last month.', 'f.ins.up': 'up', 'f.ins.down': 'down',
  'f.ins.budget': '{n} budget(s) exceeded.', 'f.ins.none': 'Log a few transactions and insights will appear here.', 'f.contributeTitle': 'Amount for “{name}”',
  'cat.housing': 'Housing', 'cat.food': 'Food', 'cat.transport': 'Transport', 'cat.leisure': 'Leisure', 'cat.shopping': 'Shopping', 'cat.health': 'Health', 'cat.subscriptions': 'Subscriptions', 'cat.education': 'Education', 'cat.other': 'Other',
  'cat.salary': 'Salary', 'cat.side': 'Side income', 'cat.gift': 'Gift', 'cat.refund': 'Refund', 'cat.other_income': 'Other',
  'c.title': 'Character', 'c.attributes': 'Attributes', 'c.rank': 'Rank', 'c.auras': 'Auras', 'c.aurasHint': 'Unlock new auras as you level up. They tint all of VYBE.', 'c.unlockAt': 'From level {level}',
  'c.active': 'Active', 'c.history': 'Progress history', 'c.howTo': 'How {attr} grows', 'c.howToText': 'Missions and habits with this attribute earn XP.',
  'aura.violet': 'Violet', 'aura.cyan': 'Cyan', 'aura.aurora': 'Aurora', 'aura.solar': 'Solar', 'aura.nebula': 'Nebula',
  'a.title': 'Achievements', 'a.unlocked': 'unlocked', 'a.locked': 'Locked', 'a.unlockedOn': 'Unlocked on {date}', 'a.bonus': '+{xp} XP bonus', 'a.new': 'Achievement unlocked!', 'a.share': 'Share',
  'a.shareText': 'I unlocked the “{title}” achievement in VYBE!', 'a.copied': 'Copied to clipboard',
  'lvl.up': 'Level up!', 'lvl.reached': 'You reached level {level}', 'lvl.continue': 'Continue',
  's.title': 'Statistics', 's.xp14': 'XP over the last 14 days', 's.byAttr': 'XP by attribute', 's.history': 'History', 's.totalXp': 'Total XP', 's.bestStreak': 'Best streak', 's.activeDays': 'Active days',
  's.missionsDone': 'Missions done', 's.empty': 'No history yet — your first completed mission will appear here.', 's.achievement': 'Achievement', 's.moneyTrack': 'Money tracked', 's.moneySave': 'Saved',
  'ai.title': 'Companion', 'ai.demoMode': 'Demo mode', 'ai.demoExplain': 'Replies come from local rules and your real VYBE data — not AI. Connect a backend in Settings for real AI replies.',
  'ai.live': 'Live AI', 'ai.placeholder': 'Ask your companion…', 'ai.send': 'Send', 'ai.thinking': 'Thinking…', 'ai.clear': 'Clear history',
  'ai.s.plan': 'Plan my day', 'ai.s.break': 'Break down my goal', 'ai.s.reflect': 'How was my week?', 'ai.s.focus': 'Tips for better focus',
  'ai.proposal': 'Suggestion', 'ai.accept': 'Accept', 'ai.dismiss': 'Dismiss', 'ai.accepted': 'Accepted', 'ai.dismissed': 'Dismissed', 'ai.acceptAll': 'Accept all',
  'ai.confirmNote': 'Suggestions change nothing until you confirm them.', 'ai.error': "The companion can't be reached right now. Demo-mode reply:", 'ai.empty': 'How can I help?', 'ai.emptyText': 'I plan your day with you, break goals into missions and reflect on your progress.',
  'so.title': 'Social', 'so.challenges': 'Challenges', 'so.friends': 'Friends', 'so.groups': 'Groups', 'so.join': 'Join', 'so.leave': 'Leave', 'so.joined': 'Joined',
  'so.demoNote': 'Demo: participants are simulated and marked as demo. Online multiplayer is prepared for a later version.', 'so.you': 'You', 'so.daysLeft': '{n} days left', 'so.ended': 'Ended', 'so.progress': '{n} of {goal} days',
  'so.newChallenge': 'Own challenge', 'so.chTitle': 'Title', 'so.chDays': 'Goal days', 'so.chLength': 'Duration (days)', 'so.addFriend': 'Add friend', 'so.friendName': 'Name',
  'so.localFriend': 'Local contact — not synced yet', 'so.noFriends': 'Add contacts to form groups. They stay local until an online backend is available.',
  'so.newGroup': 'Private group', 'so.groupName': 'Group name', 'so.members': 'Members', 'so.noGroups': 'No groups yet.', 'so.compare': 'Comparison', 'so.share': 'Share progress',
  'so.shareText': "I'm level {level} in VYBE with a {streak}-day streak! ✨", 'so.err.title': 'Title needs 2–60 characters.', 'so.demoTag': 'Demo', 'so.localTag': 'Local',
  'set.title': 'Settings', 'set.profile': 'Profile', 'set.name': 'Name', 'set.dailyTime': 'Daily time', 'set.appearance': 'Appearance', 'set.theme': 'Theme', 'set.dark': 'Dark', 'set.light': 'Light', 'set.system': 'System',
  'set.accent': 'Accent aura', 'set.language': 'Language', 'set.notifications': 'Notifications', 'set.notifEnable': 'Allow notifications', 'set.notifHabits': 'Habit reminders', 'set.notifPlan': 'Daily plan reminder',
  'set.notifDenied': 'Notifications are blocked in the browser.', 'set.notifUnsupported': "This browser doesn't support notifications.", 'set.notifNote': 'Reminders fire locally while VYBE is open.',
  'set.privacy': 'Privacy', 'set.localOnly': 'All data stays on this device (IndexedDB). No tracking, no analytics.', 'set.hideAmounts': 'Hide amounts', 'set.shareActivity': 'Share activity with friends (when sync is available)',
  'set.data': 'Data', 'set.export': 'Export data (JSON)', 'set.import': 'Import data', 'set.imported': 'Import successful', 'set.importErr': 'Import failed: file is not a valid VYBE export.',
  'set.reset': 'Delete all data', 'set.resetText': 'Permanently deletes profile, missions, habits, money and progress from this device.', 'set.resetConfirm': 'Type DELETE to confirm', 'set.resetWord': 'DELETE', 'set.resetDone': 'All data deleted',
  'set.access': 'Accessibility', 'set.motion': 'Motion', 'set.motionReduced': 'Reduced', 'set.motionFull': 'Full', 'set.largeText': 'Larger text', 'set.contrast': 'High contrast',
  'set.ai': 'AI backend', 'set.aiEndpoint': 'Endpoint URL', 'set.aiHint': 'Relative URL of your own proxy (see README). API keys never belong in the frontend.', 'set.aiTest': 'Test connection', 'set.aiOk': 'Backend reachable — live AI active', 'set.aiFail': 'Not reachable — demo mode active',
  'set.currency': 'Base currency', 'set.about': 'About VYBE', 'set.version': 'Version', 'set.restartDemo': 'Reload demo', 'set.saved': 'Saved',
  'err.title': 'Something went wrong', 'err.text': "This section couldn't load. Your data is safe.", 'err.retry': 'Reload',
  'reward.label.track': 'Money tracked', 'reward.label.save': 'Saved',
};

const dicts: Record<Lang, Record<TKey, string>> = { de, en };

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.de[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useT() {
  const lang = useVybe((s) => s.settings.lang);
  const t = (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { t, lang, attr: (a: Attribute) => t(`attr.${a}` as TKey), diff: (d: Difficulty) => t(`diff.${d}` as TKey), cat: (c: string) => (`cat.${c}` in de ? t(`cat.${c}` as TKey) : c) };
}

/** Human label for ledger entries (some labels are keys rather than text). */
export function ledgerLabel(label: string, lang: Lang): string {
  if (label === 'money:track') return translate(lang, 'reward.label.track');
  if (label === 'money:save') return translate(lang, 'reward.label.save');
  return label;
}
