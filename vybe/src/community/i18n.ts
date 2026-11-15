import { useVybe } from '@/store/useVybe';

const de = {
  title: 'Community', sub: 'Finde Menschen, die ticken wie du.',
  'tab.discover': 'Entdecken', 'tab.feed': 'Feed', 'tab.connections': 'Kontakte', 'tab.profile': 'Profil',
  'mode.live': 'Live', 'mode.liveText': 'Profile, Beiträge und Verbindungen sind für alle sichtbar, die diesen VYBE-Link geöffnet haben.',
  'mode.local': 'Lokal', 'mode.localText': 'Diese Version hat noch keinen Community-Server. Dein Profil bleibt auf diesem Gerät; die anderen Mitglieder sind Demo-Profile. Die Live-Community läuft im geteilten VYBE-Link.',
  'mode.readOnly': 'Du kannst die Community ansehen. Zum Mitmachen braucht dein Zugang mindestens die Stufe „Mitwirkende“ – frag die Person, die den Link geteilt hat.',
  'status.loading': 'Community wird geladen…', 'status.stale': 'Die Community ist gerade nicht erreichbar. Angezeigte Daten können veraltet sein.', 'status.error': 'Verbindung zur Community verloren. Lade die Seite neu, um es erneut zu versuchen.',
  'create.title': 'Erstelle dein Community-Profil', 'create.text': 'Zeig, was du magst – Musik, Filme, Serien, Hobbys – und VYBE zeigt dir Menschen mit denselben Interessen.', 'create.cta': 'Profil erstellen',
  'edit.title': 'Community-Profil', 'edit.basics': 'Über dich', 'edit.nickname': 'Anzeigename', 'edit.age': 'Alter', 'edit.ageHint': 'Die Community ist ab 16. Dein Alter hilft beim Matching.',
  'edit.showAge': 'Alter im Profil zeigen', 'edit.city': 'Stadt / Region', 'edit.pronouns': 'Pronomen', 'edit.bio': 'Kurzbeschreibung', 'edit.bioPh': 'Woran arbeitest du gerade? Was macht dich aus?',
  'edit.privacy': 'Sichtbarkeit', 'edit.discoverable': 'In „Entdecken“ zeigen', 'edit.discoverableHint': 'Aus: Nur deine Verbindungen sehen dein Profil und deine Beiträge.',
  'edit.shareStats': 'Level & Serie zeigen', 'edit.addCustom': 'Eigenes hinzufügen…', 'edit.selected': '{n} gewählt', 'edit.showAll': 'Alle anzeigen', 'edit.showLess': 'Weniger',
  'edit.err.nick': 'Anzeigename braucht 2–24 Zeichen.', 'edit.err.age': 'Die Community ist ab 16 Jahren.', 'edit.saved': 'Profil gespeichert', 'edit.delete': 'Profil löschen',
  'edit.deleteText': 'Entfernt dein Profil, deine Beiträge, Likes und Kommentare aus der Community.', 'edit.deleted': 'Profil gelöscht',
  'cat.musicGenres': 'Musik-Genres', 'cat.artists': 'Lieblings-Künstler', 'cat.movieGenres': 'Film- & Serien-Genres', 'cat.movies': 'Lieblingsfilme', 'cat.series': 'Lieblingsserien',
  'cat.hobbies': 'Hobbys', 'cat.sports': 'Sport', 'cat.games': 'Games', 'cat.books': 'Bücher', 'cat.languages': 'Sprachen', 'cat.personality': 'Persönlichkeit', 'cat.lookingFor': 'Ich suche',
  'ph.artists': 'z. B. Lieblingsband oder -künstlerin', 'ph.movies': 'Filmtitel', 'ph.series': 'Serientitel', 'ph.books': 'Buchtitel',
  'disc.search': 'Suche nach Name, Stadt oder Interesse', 'disc.lookingFor': 'Sucht', 'disc.age': 'Alter', 'disc.any': 'Alle', 'disc.empty': 'Noch keine passenden Profile',
  'disc.emptyLive': 'Teile den VYBE-Link mit Freunden – sobald sie ein Profil erstellen, erscheinen sie hier.', 'disc.emptyFilter': 'Lockere die Filter, um mehr Menschen zu sehen.',
  'disc.match': 'Match', 'disc.common': 'Gemeinsam', 'disc.nothingCommon': 'Noch keine gemeinsamen Interessen – vielleicht entdeckst du Neues.',
  'rel.connect': 'Verbinden', 'rel.requested': 'Angefragt', 'rel.withdraw': 'Anfrage zurückziehen', 'rel.connected': 'Verbunden', 'rel.accept': 'Annehmen', 'rel.decline': 'Ablehnen',
  'rel.remove': 'Verbindung lösen', 'rel.block': 'Blockieren', 'rel.unblock': 'Blockierung aufheben', 'rel.blockText': 'Ihr seht eure Profile und Beiträge gegenseitig nicht mehr.',
  'conn.incoming': 'Anfragen an dich', 'conn.connected': 'Deine Verbindungen', 'conn.sent': 'Gesendete Anfragen', 'conn.blocked': 'Blockiert', 'conn.none': 'Noch keine Verbindungen. In „Entdecken“ findest du Menschen mit gemeinsamen Interessen.',
  'feed.placeholder': 'Teile einen Fortschritt, eine Frage oder einen Tipp…', 'feed.post': 'Posten', 'feed.attach': 'Fortschritt anhängen', 'feed.all': 'Alle', 'feed.connections': 'Verbindungen', 'feed.questions': 'Fragen',
  'feed.empty': 'Noch keine Beiträge', 'feed.emptyText': 'Mach den Anfang – erzähl, woran du gerade arbeitest.', 'feed.needProfile': 'Erstelle ein Profil, um zu posten.',
  'feed.comment': 'Kommentieren', 'feed.commentPh': 'Antworten…', 'feed.delete': 'Löschen', 'feed.moderate': 'Als Moderator entfernen', 'feed.like': 'Gefällt mir', 'feed.comments': '{n} Kommentare',
  'feed.err.length': 'Beitrag braucht 1–500 Zeichen.', 'feed.posted': 'Beitrag geteilt', 'feed.you': 'Du',
  'kind.update': 'Update', 'kind.win': 'Erfolg', 'kind.question': 'Frage', 'kind.tip': 'Tipp', 'kind.buddy': 'Suche Buddy',
  'attach.level': 'Level {v}', 'attach.streak': '{v}-Tage-Serie', 'attach.achievement': 'Erfolg: {v}',
  'profile.years': '{n} Jahre', 'profile.level': 'Level {n}', 'profile.streak': '{n} Tage Serie', 'profile.account': 'Konto: {name}', 'profile.preview': 'So sehen dich andere',
  'time.now': 'gerade eben', 'time.min': 'vor {n} Min.', 'time.h': 'vor {n} Std.', 'time.d': 'vor {n} T.',
  demo: 'Demo', save: 'Speichern', cancel: 'Abbrechen', edit: 'Bearbeiten', confirm: 'Bestätigen', close: 'Schließen',
};
type K = keyof typeof de;
const en: Record<K, string> = {
  title: 'Community', sub: 'Find people who tick like you.',
  'tab.discover': 'Discover', 'tab.feed': 'Feed', 'tab.connections': 'People', 'tab.profile': 'Profile',
  'mode.live': 'Live', 'mode.liveText': 'Profiles, posts and connections are visible to everyone who has opened this VYBE link.',
  'mode.local': 'Local', 'mode.localText': 'This version has no community server yet. Your profile stays on this device; other members are demo profiles. The live community runs in the shared VYBE link.',
  'mode.readOnly': 'You can browse the community. To take part, your access needs at least the “Contributor” level — ask whoever shared the link.',
  'status.loading': 'Loading community…', 'status.stale': "The community can't be reached right now. What you see may be out of date.", 'status.error': 'Lost connection to the community. Reload the page to try again.',
  'create.title': 'Create your community profile', 'create.text': 'Show what you love — music, films, series, hobbies — and VYBE shows you people with the same interests.', 'create.cta': 'Create profile',
  'edit.title': 'Community profile', 'edit.basics': 'About you', 'edit.nickname': 'Display name', 'edit.age': 'Age', 'edit.ageHint': 'The community is 16+. Your age helps matching.',
  'edit.showAge': 'Show age on profile', 'edit.city': 'City / region', 'edit.pronouns': 'Pronouns', 'edit.bio': 'Short bio', 'edit.bioPh': 'What are you working on? What makes you you?',
  'edit.privacy': 'Visibility', 'edit.discoverable': 'Show in Discover', 'edit.discoverableHint': 'Off: only your connections see your profile and posts.',
  'edit.shareStats': 'Show level & streak', 'edit.addCustom': 'Add your own…', 'edit.selected': '{n} selected', 'edit.showAll': 'Show all', 'edit.showLess': 'Less',
  'edit.err.nick': 'Display name needs 2–24 characters.', 'edit.err.age': 'The community is for ages 16 and up.', 'edit.saved': 'Profile saved', 'edit.delete': 'Delete profile',
  'edit.deleteText': 'Removes your profile, posts, likes and comments from the community.', 'edit.deleted': 'Profile deleted',
  'cat.musicGenres': 'Music genres', 'cat.artists': 'Favourite artists', 'cat.movieGenres': 'Film & series genres', 'cat.movies': 'Favourite films', 'cat.series': 'Favourite series',
  'cat.hobbies': 'Hobbies', 'cat.sports': 'Sports', 'cat.games': 'Games', 'cat.books': 'Books', 'cat.languages': 'Languages', 'cat.personality': 'Personality', 'cat.lookingFor': "I'm looking for",
  'ph.artists': 'e.g. favourite band or artist', 'ph.movies': 'Film title', 'ph.series': 'Series title', 'ph.books': 'Book title',
  'disc.search': 'Search by name, city or interest', 'disc.lookingFor': 'Looking for', 'disc.age': 'Age', 'disc.any': 'All', 'disc.empty': 'No matching profiles yet',
  'disc.emptyLive': 'Share the VYBE link with friends — once they create a profile they show up here.', 'disc.emptyFilter': 'Loosen the filters to see more people.',
  'disc.match': 'Match', 'disc.common': 'In common', 'disc.nothingCommon': 'No shared interests yet — maybe you discover something new.',
  'rel.connect': 'Connect', 'rel.requested': 'Requested', 'rel.withdraw': 'Withdraw request', 'rel.connected': 'Connected', 'rel.accept': 'Accept', 'rel.decline': 'Decline',
  'rel.remove': 'Remove connection', 'rel.block': 'Block', 'rel.unblock': 'Unblock', 'rel.blockText': "You won't see each other's profiles or posts anymore.",
  'conn.incoming': 'Requests to you', 'conn.connected': 'Your connections', 'conn.sent': 'Sent requests', 'conn.blocked': 'Blocked', 'conn.none': 'No connections yet. Discover shows people with shared interests.',
  'feed.placeholder': 'Share progress, a question or a tip…', 'feed.post': 'Post', 'feed.attach': 'Attach progress', 'feed.all': 'All', 'feed.connections': 'Connections', 'feed.questions': 'Questions',
  'feed.empty': 'No posts yet', 'feed.emptyText': "Go first — tell people what you're working on.", 'feed.needProfile': 'Create a profile to post.',
  'feed.comment': 'Comment', 'feed.commentPh': 'Reply…', 'feed.delete': 'Delete', 'feed.moderate': 'Remove as moderator', 'feed.like': 'Like', 'feed.comments': '{n} comments',
  'feed.err.length': 'A post needs 1–500 characters.', 'feed.posted': 'Post shared', 'feed.you': 'You',
  'kind.update': 'Update', 'kind.win': 'Win', 'kind.question': 'Question', 'kind.tip': 'Tip', 'kind.buddy': 'Looking for a buddy',
  'attach.level': 'Level {v}', 'attach.streak': '{v}-day streak', 'attach.achievement': 'Achievement: {v}',
  'profile.years': '{n} years', 'profile.level': 'Level {n}', 'profile.streak': '{n}-day streak', 'profile.account': 'Account: {name}', 'profile.preview': 'How others see you',
  'time.now': 'just now', 'time.min': '{n} min ago', 'time.h': '{n} h ago', 'time.d': '{n} d ago',
  demo: 'Demo', save: 'Save', cancel: 'Cancel', edit: 'Edit', confirm: 'Confirm', close: 'Close',
};

export type CKey = K;
export function useCT() {
  const lang = useVybe((s) => s.settings.lang);
  const ct = (k: K, vars?: Record<string, string | number>) => {
    let s = (lang === 'de' ? de : en)[k];
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.split(`{${a}}`).join(String(b));
    return s;
  };
  const ago = (iso: string) => {
    const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (m < 1) return ct('time.now');
    if (m < 60) return ct('time.min', { n: m });
    if (m < 1440) return ct('time.h', { n: Math.round(m / 60) });
    return ct('time.d', { n: Math.round(m / 1440) });
  };
  return { ct, lang, ago };
}
