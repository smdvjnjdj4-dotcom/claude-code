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

  'tab.search': 'Suche', 'tab.clips': 'Clips', 'tab.chats': 'Chats', 'tab.games': 'Spiele',
  'edit.handle': '@Handle', 'edit.handleHint': '3–20 Zeichen: Kleinbuchstaben, Zahlen, _ und .', 'edit.err.handle': 'Handle braucht 3–20 Zeichen (a–z, 0–9, _ und .).', 'edit.err.handleTaken': 'Dieses Handle ist schon vergeben.',
  'edit.account': 'Profiltyp', 'edit.personal': 'Persönlich', 'edit.creator': 'Creator / Influencer', 'edit.creatorHint': 'Creator-Profile haben ein Abzeichen, Follower und Kanal-Links. Das Abzeichen ist eine Selbstauskunft, keine Verifizierung.',
  'edit.category': 'Thema', 'edit.links': 'Kanäle', 'edit.linkPh': 'Handle', 'edit.webPh': 'https://…',
  'ccat.fitness': 'Fitness', 'ccat.finance': 'Finanzen', 'ccat.learning': 'Lernen', 'ccat.creative': 'Kreativ', 'ccat.gaming': 'Gaming', 'ccat.lifestyle': 'Lifestyle', 'ccat.music': 'Musik', 'ccat.tech': 'Tech', 'ccat.food': 'Food', 'ccat.travel': 'Reisen',
  'plat.instagram': 'Instagram', 'plat.tiktok': 'TikTok', 'plat.youtube': 'YouTube', 'plat.twitch': 'Twitch', 'plat.x': 'X', 'plat.website': 'Website',
  'creator': 'Creator', 'follow': 'Folgen', 'following': 'Folge ich', 'followers': '{n} Follower', 'dash.title': 'Creator-Dashboard', 'dash.followers': 'Follower', 'dash.likes': 'Likes', 'dash.posts': 'Beiträge', 'dash.clips': 'Clips',
  'search.ph': 'Name, @Handle, Stadt oder Interesse', 'search.all': 'Alle', 'search.creators': 'Creator', 'search.people': 'Personen', 'search.hint': 'Tippe, um Profile zu finden.', 'search.none': 'Keine Treffer für „{q}“.', 'search.topCreators': 'Beliebte Creator',
  'clip.add': 'Video', 'clip.remove': 'Video entfernen', 'clip.tooLong': 'Clips dürfen höchstens 60 Sekunden lang sein (dieses: {s} s).', 'clip.tooBig': 'Die Datei ist zu groß (max. 20 MB).', 'clip.bad': 'Dieses Video kann nicht gelesen werden.',
  'clip.uploading': 'Video wird hochgeladen…', 'clip.uploadFail': 'Upload fehlgeschlagen.', 'clip.noUpload': 'Videos hochladen können hier nur Personen mit Bearbeitungs- oder Mitwirkenden-Zugriff.', 'clip.empty': 'Noch keine Clips', 'clip.emptyText': 'Lade das erste Video hoch – maximal 60 Sekunden.', 'clip.unavailable': 'Video nicht verfügbar', 'clip.tapSound': 'Tippen für Ton',
  'chat.title': 'Nachrichten', 'chat.new': 'Neuer Chat', 'chat.empty': 'Noch keine Chats', 'chat.emptyText': 'Schreib einem deiner Kontakte oder einem Creator, dem du folgst.', 'chat.ph': 'Nachricht schreiben…', 'chat.send': 'Senden',
  'chat.e2ee': 'Ende-zu-Ende-verschlüsselt: Nur ihr beide könnt den Inhalt lesen. Sichtbar ist nur, wer wem wann schreibt.', 'chat.local': 'Demo-Chat auf diesem Gerät. Demo-Mitglieder antworten automatisch.',
  'chat.noKey': 'Diese Person hat noch keinen Nachrichten-Schlüssel. Sobald sie VYBE wieder öffnet, könnt ihr schreiben.', 'chat.undecryptable': 'Nachricht kann nicht entschlüsselt werden', 'chat.cannot': 'Du kannst nur Kontakten und Creatorn schreiben, denen du folgst.',
  'chat.streak': '{n}-Tage-Serie', 'chat.streakHint': 'Schreibt euch beide an aufeinanderfolgenden Tagen. Nächstes Accessoire: {acc} ab {n} Tagen.', 'chat.streakMax': 'Höchstes Accessoire erreicht.', 'chat.pick': 'Wem möchtest du schreiben?', 'chat.you': 'Du: ',
  'acc.title': 'Accessoires', 'acc.spark': 'Funke', 'acc.flame': 'Flamme', 'acc.comet': 'Komet', 'acc.supernova': 'Supernova',
  'game.new': 'Neues Spiel', 'game.pickType': 'Spiel', 'game.pickOpp': 'Gegner', 'game.invite': 'Herausfordern', 'game.empty': 'Noch keine Spiele', 'game.emptyText': 'Fordere einen Kontakt zu Tic-Tac-Toe, Vier gewinnt oder Schere-Stein-Papier heraus.',
  'game.ttt': 'Tic-Tac-Toe', 'game.c4': 'Vier gewinnt', 'game.rps': 'Schere, Stein, Papier', 'game.tttDesc': 'Drei in einer Reihe', 'game.c4Desc': 'Vier in einer Reihe', 'game.rpsDesc': 'Best of 3, verdeckte Wahl',
  'game.yourTurn': 'Du bist dran', 'game.theirTurn': '{name} ist dran', 'game.invitedYou': '{name} fordert dich heraus', 'game.waitingAccept': 'Wartet auf {name}', 'game.accept': 'Annehmen', 'game.decline': 'Ablehnen',
  'game.won': 'Du hast gewonnen!', 'game.lost': '{name} hat gewonnen', 'game.draw': 'Unentschieden', 'game.resign': 'Aufgeben', 'game.resigned': 'aufgegeben', 'game.remove': 'Aus Liste entfernen', 'game.rematch': 'Revanche',
  'game.sec.turn': 'Am Zug', 'game.sec.waiting': 'Warten', 'game.sec.invites': 'Einladungen', 'game.sec.done': 'Beendet', 'game.challenge': 'Zum Spiel herausfordern', 'game.message': 'Nachricht',
  'rps.0': 'Stein', 'rps.1': 'Papier', 'rps.2': 'Schere', 'rps.choose': 'Wähle verdeckt', 'rps.waiting': 'Warte auf die Wahl von {name}…', 'rps.revealing': 'Wird aufgedeckt…', 'rps.round': 'Runde {n}', 'rps.hidden': 'Deine Wahl bleibt verdeckt, bis beide gewählt haben.',
  'demoBot': 'Demo-Gegner',
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

  'tab.search': 'Search', 'tab.clips': 'Clips', 'tab.chats': 'Chats', 'tab.games': 'Games',
  'edit.handle': '@handle', 'edit.handleHint': '3–20 characters: lowercase letters, digits, _ and .', 'edit.err.handle': 'Handle needs 3–20 characters (a–z, 0–9, _ and .).', 'edit.err.handleTaken': 'This handle is already taken.',
  'edit.account': 'Profile type', 'edit.personal': 'Personal', 'edit.creator': 'Creator / influencer', 'edit.creatorHint': 'Creator profiles get a badge, followers and channel links. The badge is self-declared, not a verification.',
  'edit.category': 'Topic', 'edit.links': 'Channels', 'edit.linkPh': 'Handle', 'edit.webPh': 'https://…',
  'ccat.fitness': 'Fitness', 'ccat.finance': 'Finance', 'ccat.learning': 'Learning', 'ccat.creative': 'Creative', 'ccat.gaming': 'Gaming', 'ccat.lifestyle': 'Lifestyle', 'ccat.music': 'Music', 'ccat.tech': 'Tech', 'ccat.food': 'Food', 'ccat.travel': 'Travel',
  'plat.instagram': 'Instagram', 'plat.tiktok': 'TikTok', 'plat.youtube': 'YouTube', 'plat.twitch': 'Twitch', 'plat.x': 'X', 'plat.website': 'Website',
  'creator': 'Creator', 'follow': 'Follow', 'following': 'Following', 'followers': '{n} followers', 'dash.title': 'Creator dashboard', 'dash.followers': 'Followers', 'dash.likes': 'Likes', 'dash.posts': 'Posts', 'dash.clips': 'Clips',
  'search.ph': 'Name, @handle, city or interest', 'search.all': 'All', 'search.creators': 'Creators', 'search.people': 'People', 'search.hint': 'Start typing to find profiles.', 'search.none': 'No results for “{q}”.', 'search.topCreators': 'Popular creators',
  'clip.add': 'Video', 'clip.remove': 'Remove video', 'clip.tooLong': 'Clips can be at most 60 seconds long (this one: {s} s).', 'clip.tooBig': 'The file is too large (max 20 MB).', 'clip.bad': "This video can't be read.",
  'clip.uploading': 'Uploading video…', 'clip.uploadFail': 'Upload failed.', 'clip.noUpload': 'Only people with Editor or Contributor access can upload videos here.', 'clip.empty': 'No clips yet', 'clip.emptyText': 'Upload the first video — 60 seconds max.', 'clip.unavailable': 'Video not available', 'clip.tapSound': 'Tap for sound',
  'chat.title': 'Messages', 'chat.new': 'New chat', 'chat.empty': 'No chats yet', 'chat.emptyText': 'Message one of your connections or a creator you follow.', 'chat.ph': 'Write a message…', 'chat.send': 'Send',
  'chat.e2ee': 'End-to-end encrypted: only the two of you can read the content. Only who writes to whom and when is visible.', 'chat.local': 'Demo chat on this device. Demo members reply automatically.',
  'chat.noKey': "This person doesn't have a message key yet. Once they open VYBE again, you can write.", 'chat.undecryptable': "Message can't be decrypted", 'chat.cannot': 'You can only message connections and creators you follow.',
  'chat.streak': '{n}-day streak', 'chat.streakHint': 'Both write on consecutive days. Next accessory: {acc} from {n} days.', 'chat.streakMax': 'Top accessory reached.', 'chat.pick': 'Who do you want to message?', 'chat.you': 'You: ',
  'acc.title': 'Accessories', 'acc.spark': 'Spark', 'acc.flame': 'Flame', 'acc.comet': 'Comet', 'acc.supernova': 'Supernova',
  'game.new': 'New game', 'game.pickType': 'Game', 'game.pickOpp': 'Opponent', 'game.invite': 'Challenge', 'game.empty': 'No games yet', 'game.emptyText': 'Challenge a connection to Tic-Tac-Toe, Connect Four or Rock-Paper-Scissors.',
  'game.ttt': 'Tic-Tac-Toe', 'game.c4': 'Connect Four', 'game.rps': 'Rock, Paper, Scissors', 'game.tttDesc': 'Three in a row', 'game.c4Desc': 'Four in a row', 'game.rpsDesc': 'Best of 3, hidden picks',
  'game.yourTurn': 'Your turn', 'game.theirTurn': "{name}'s turn", 'game.invitedYou': '{name} challenges you', 'game.waitingAccept': 'Waiting for {name}', 'game.accept': 'Accept', 'game.decline': 'Decline',
  'game.won': 'You won!', 'game.lost': '{name} won', 'game.draw': 'Draw', 'game.resign': 'Resign', 'game.resigned': 'resigned', 'game.remove': 'Remove from list', 'game.rematch': 'Rematch',
  'game.sec.turn': 'Your move', 'game.sec.waiting': 'Waiting', 'game.sec.invites': 'Invitations', 'game.sec.done': 'Finished', 'game.challenge': 'Challenge to a game', 'game.message': 'Message',
  'rps.0': 'Rock', 'rps.1': 'Paper', 'rps.2': 'Scissors', 'rps.choose': 'Pick in secret', 'rps.waiting': "Waiting for {name}'s pick…", 'rps.revealing': 'Revealing…', 'rps.round': 'Round {n}', 'rps.hidden': 'Your pick stays hidden until both have picked.',
  'demoBot': 'Demo opponent',
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
