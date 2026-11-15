import type { InterestKey } from './types';

type Opt = [id: string, de: string, en: string];
const o = (prefix: string, rows: [string, string][]): Opt[] => rows.map(([de, en]) => [`${prefix}.${en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, de, en]);

/** Large, curated option lists. Free-text categories (artists, movies, series, books) have no list. */
export const OPTIONS: Partial<Record<InterestKey, Opt[]>> = {
  musicGenres: o('mg', [
    ['Pop', 'Pop'], ['Hip-Hop', 'Hip-Hop'], ['Deutschrap', 'German rap'], ['R&B', 'R&B'], ['Rock', 'Rock'], ['Indie', 'Indie'], ['Alternative', 'Alternative'],
    ['Metal', 'Metal'], ['Punk', 'Punk'], ['Techno', 'Techno'], ['House', 'House'], ['EDM', 'EDM'], ['Drum & Bass', 'Drum & Bass'], ['Trance', 'Trance'],
    ['Hardstyle', 'Hardstyle'], ['Jazz', 'Jazz'], ['Soul', 'Soul'], ['Funk', 'Funk'], ['Klassik', 'Classical'], ['Lo-Fi', 'Lo-fi'], ['K-Pop', 'K-pop'],
    ['J-Pop', 'J-pop'], ['Reggaeton', 'Reggaeton'], ['Latin', 'Latin'], ['Afrobeats', 'Afrobeats'], ['Country', 'Country'], ['Folk', 'Folk'],
    ['Schlager', 'Schlager'], ['Blues', 'Blues'], ['Reggae', 'Reggae'], ['Dancehall', 'Dancehall'], ['Ambient', 'Ambient'], ['Filmmusik', 'Soundtracks'],
    ['Singer-Songwriter', 'Singer-songwriter'], ['Gospel', 'Gospel'], ['Synthwave', 'Synthwave'], ['Hyperpop', 'Hyperpop'], ['Emo', 'Emo'], ['Grime', 'Grime'], ['Trap', 'Trap'],
  ]),
  movieGenres: o('fg', [
    ['Action', 'Action'], ['Komödie', 'Comedy'], ['Drama', 'Drama'], ['Thriller', 'Thriller'], ['Horror', 'Horror'], ['Science-Fiction', 'Science fiction'],
    ['Fantasy', 'Fantasy'], ['Animation', 'Animation'], ['Anime', 'Anime'], ['Dokumentation', 'Documentary'], ['Romantik', 'Romance'], ['Krimi', 'Crime'],
    ['Mystery', 'Mystery'], ['Abenteuer', 'Adventure'], ['Historisch', 'Historical'], ['Superhelden', 'Superheroes'], ['Musical', 'Musical'],
    ['Western', 'Western'], ['Indie-Film', 'Indie film'], ['Kriegsfilm', 'War'], ['True Crime', 'True crime'], ['Familienfilm', 'Family'],
    ['Sitcom', 'Sitcom'], ['Reality-TV', 'Reality TV'], ['K-Drama', 'K-drama'], ['Psychothriller', 'Psychological thriller'], ['Mockumentary', 'Mockumentary'],
  ]),
  hobbies: o('hb', [
    ['Lesen', 'Reading'], ['Schreiben', 'Writing'], ['Zeichnen', 'Drawing'], ['Malen', 'Painting'], ['Fotografie', 'Photography'], ['Filmen & Schneiden', 'Filmmaking'],
    ['Musik machen', 'Making music'], ['Gitarre', 'Guitar'], ['Klavier', 'Piano'], ['Singen', 'Singing'], ['DJing', 'DJing'], ['Beats produzieren', 'Producing beats'],
    ['Kochen', 'Cooking'], ['Backen', 'Baking'], ['Gärtnern', 'Gardening'], ['Reisen', 'Travel'], ['Wandern', 'Hiking'], ['Camping', 'Camping'], ['Angeln', 'Fishing'],
    ['Gaming', 'Gaming'], ['Brettspiele', 'Board games'], ['Schach', 'Chess'], ['Programmieren', 'Coding'], ['Basteln & DIY', 'DIY & crafts'], ['Nähen', 'Sewing'],
    ['Stricken & Häkeln', 'Knitting & crochet'], ['Tanzen', 'Dancing'], ['Meditation', 'Meditation'], ['Mode', 'Fashion'], ['Sneaker', 'Sneakers'], ['Autos', 'Cars'],
    ['Motorräder', 'Motorbikes'], ['Tiere', 'Animals'], ['Ehrenamt', 'Volunteering'], ['Sprachen lernen', 'Learning languages'], ['Podcasts', 'Podcasts'],
    ['Comics & Manga', 'Comics & manga'], ['Kunst & Museen', 'Art & museums'], ['Theater', 'Theatre'], ['Konzerte & Festivals', 'Concerts & festivals'],
    ['Investieren', 'Investing'], ['Unternehmertum', 'Entrepreneurship'], ['Technik & Gadgets', 'Tech & gadgets'], ['Astronomie', 'Astronomy'], ['Geschichte', 'History'],
    ['Philosophie', 'Philosophy'], ['Psychologie', 'Psychology'], ['Nachhaltigkeit', 'Sustainability'], ['Journaling', 'Journaling'], ['Content Creation', 'Content creation'],
    ['3D-Druck', '3D printing'], ['Modellbau', 'Model building'], ['Pflanzen', 'Houseplants'], ['Kaffee', 'Coffee'], ['Tee', 'Tea'], ['Wein & Craft Beer', 'Wine & craft beer'],
  ]),
  sports: o('sp', [
    ['Gym & Krafttraining', 'Gym & strength'], ['Laufen', 'Running'], ['Radfahren', 'Cycling'], ['Schwimmen', 'Swimming'], ['Fußball', 'Football (soccer)'],
    ['Basketball', 'Basketball'], ['Volleyball', 'Volleyball'], ['Tennis', 'Tennis'], ['Tischtennis', 'Table tennis'], ['Badminton', 'Badminton'], ['Padel', 'Padel'],
    ['Bouldern & Klettern', 'Bouldering & climbing'], ['Kampfsport', 'Martial arts'], ['Boxen', 'Boxing'], ['Yoga', 'Yoga'], ['Pilates', 'Pilates'], ['Skifahren', 'Skiing'],
    ['Snowboarden', 'Snowboarding'], ['Surfen', 'Surfing'], ['Skaten', 'Skating'], ['Reiten', 'Horse riding'], ['Handball', 'Handball'], ['Golf', 'Golf'],
    ['Calisthenics', 'Calisthenics'], ['CrossFit', 'CrossFit'], ['Leichtathletik', 'Athletics'], ['Rudern', 'Rowing'], ['Eishockey', 'Ice hockey'],
    ['American Football', 'American football'], ['Triathlon', 'Triathlon'], ['Spikeball', 'Spikeball'], ['Wandern & Trailrunning', 'Trail running'],
  ]),
  games: o('gm', [
    ['Shooter', 'Shooters'], ['Rollenspiele (RPG)', 'RPGs'], ['MMO', 'MMOs'], ['Strategie', 'Strategy'], ['Simulation', 'Simulation'], ['Sportspiele', 'Sports games'],
    ['Racing', 'Racing'], ['Battle Royale', 'Battle royale'], ['Indie-Games', 'Indie games'], ['Puzzle', 'Puzzle'], ['Survival', 'Survival'], ['Sandbox', 'Sandbox'],
    ['MOBA', 'MOBA'], ['Fighting', 'Fighting'], ['Horror-Games', 'Horror games'], ['Mobile Games', 'Mobile games'], ['Retro', 'Retro'], ['Rhythmus', 'Rhythm'],
    ['Cozy Games', 'Cozy games'], ['Soulslike', 'Soulslike'], ['Party-Games', 'Party games'], ['VR', 'VR'], ['PC', 'PC'], ['PlayStation', 'PlayStation'], ['Xbox', 'Xbox'], ['Nintendo Switch', 'Nintendo Switch'],
  ]),
  languages: o('ln', [
    ['Deutsch', 'German'], ['Englisch', 'English'], ['Spanisch', 'Spanish'], ['Französisch', 'French'], ['Italienisch', 'Italian'], ['Türkisch', 'Turkish'],
    ['Arabisch', 'Arabic'], ['Russisch', 'Russian'], ['Polnisch', 'Polish'], ['Portugiesisch', 'Portuguese'], ['Niederländisch', 'Dutch'], ['Ukrainisch', 'Ukrainian'],
    ['Chinesisch', 'Chinese'], ['Japanisch', 'Japanese'], ['Koreanisch', 'Korean'], ['Griechisch', 'Greek'], ['Kroatisch', 'Croatian'], ['Serbisch', 'Serbian'],
    ['Rumänisch', 'Romanian'], ['Persisch', 'Persian'], ['Hindi', 'Hindi'], ['Kurdisch', 'Kurdish'], ['Albanisch', 'Albanian'], ['Gebärdensprache', 'Sign language'],
  ]),
  personality: o('ps', [
    ['Frühaufsteher', 'Early bird'], ['Nachteule', 'Night owl'], ['Introvertiert', 'Introvert'], ['Extrovertiert', 'Extrovert'], ['Ambivertiert', 'Ambivert'],
    ['Abenteuerlustig', 'Adventurous'], ['Planer', 'Planner'], ['Spontan', 'Spontaneous'], ['Kreativkopf', 'Creative mind'], ['Analytisch', 'Analytical'],
    ['Ruhig', 'Calm'], ['Energiegeladen', 'High energy'], ['Humorvoll', 'Funny'], ['Tiefgründig', 'Deep thinker'], ['Optimist', 'Optimist'], ['Ehrgeizig', 'Ambitious'],
  ]),
  lookingFor: o('lf', [
    ['Neue Freundschaften', 'New friends'], ['Accountability-Partner', 'Accountability partner'], ['Trainingspartner', 'Workout buddy'], ['Lernpartner', 'Study buddy'],
    ['Kreative Kollabs', 'Creative collabs'], ['Austausch über Finanzen', 'Money talk'], ['Gaming-Buddys', 'Gaming buddies'], ['Konzert- & Event-Begleitung', 'Concert & event company'],
    ['Sprachtandem', 'Language exchange'], ['Einfach quatschen', 'Just chatting'], ['Lauf- & Radgruppe', 'Running & cycling group'], ['Gründer & Side-Projects', 'Founders & side projects'],
  ]),
};

const LABELS = new Map<string, [string, string]>();
for (const list of Object.values(OPTIONS)) for (const [id, de, en] of list!) LABELS.set(id, [de, en]);

/** Display label for a stored interest value (option id or custom text). */
export function interestLabel(value: string, lang: 'de' | 'en'): string {
  const l = LABELS.get(value);
  return l ? (lang === 'de' ? l[0] : l[1]) : value;
}

/** Normalise a value for comparison: option ids stay, custom text is case/space-insensitive. */
export function normInterest(value: string): string {
  return LABELS.has(value) ? value : value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const FREE_TEXT_KEYS: InterestKey[] = ['artists', 'movies', 'series', 'books'];
