import type { Member } from './types';
import { emptyMemberDoc, emptyProfile } from './model';
import type { Lang } from '@/domain/types';

export const LOCAL_ME = 'local-me';

/** Demo members for the standalone app. Always rendered with a "Demo" tag; never presented as real people. */
export function demoMembers(lang: Lang): Member[] {
  const de = lang === 'de';
  const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
  const mk = (id: string, nickname: string, age: number, city: string, bio: string, i: Partial<Member['profile']['interests']>, stats: Member['profile']['stats'], extra: Partial<Omit<Member, 'profile'>> & { profile?: Partial<Member['profile']> } = {}): Member => {
    const p = emptyProfile(nickname);
    const { profile: pp, ...rest } = extra as Partial<Member> & { profile?: Partial<Member['profile']> };
    return { ...emptyMemberDoc({ ...p, handle: nickname.toLowerCase(), age, city, bio, interests: { ...p.interests, ...i }, stats, ...(pp ?? {}) }), id, demo: true, ...rest };
  };
  return [
    mk('demo-mira', 'Mira', 24, 'Berlin', de ? 'Morgens Bouldern, abends Indie-Konzerte. Suche jemanden für 6-Uhr-Workouts.' : 'Bouldering mornings, indie gigs at night. Looking for a 6am workout buddy.',
      { musicGenres: ['mg.indie', 'mg.techno', 'mg.alternative'], hobbies: ['hb.photography', 'hb.concerts-festivals', 'hb.coffee'], sports: ['sp.bouldering-climbing', 'sp.running'], series: ['Dark', 'The Bear'], lookingFor: ['lf.workout-buddy', 'lf.concert-event-company'], personality: ['ps.early-bird', 'ps.adventurous'], languages: ['ln.german', 'ln.english'] },
      { level: 9, streak: 23, topAttribute: 'fitness' },
      { follows: ['local-me'], posts: [{ id: 'p1', video: null, kind: 'win', text: de ? '23 Tage Serie! Bouldern 3x pro Woche hält mich auf Kurs.' : '23-day streak! Bouldering 3x a week keeps me on track.', attach: { type: 'streak', value: '23' }, at: daysAgo(0, 3) }] }),
    mk('demo-jonas', 'Jonas', 29, 'Hamburg', de ? 'Lese 20 Seiten am Tag und baue nebenbei eine App. Sci-Fi-Nerd.' : 'Reading 20 pages a day while building an app on the side. Sci-fi nerd.',
      { musicGenres: ['mg.lo-fi', 'mg.synthwave', 'mg.jazz'], movieGenres: ['fg.science-fiction', 'fg.documentary'], movies: ['Interstellar', 'Arrival'], hobbies: ['hb.reading', 'hb.coding', 'hb.chess'], books: ['Der Marsianer'], lookingFor: ['lf.accountability-partner', 'lf.founders-side-projects'], personality: ['ps.night-owl', 'ps.analytical'] },
      { level: 12, streak: 41, topAttribute: 'intelligence' },
      { profile: { accountType: 'creator', creatorCategory: 'learning', handle: 'jonas.liest' }, follows: ['local-me'], posts: [{ id: 'p1', video: null, kind: 'question', text: de ? 'Wer hat Lust auf einen Lese-Accountability-Check jeden Sonntag?' : 'Anyone up for a reading accountability check every Sunday?', attach: null, at: daysAgo(1, 2) }] }),
    mk('demo-lea', 'Lea', 21, 'München', de ? 'Studentin, spare auf ein Auslandssemester. Musik ist mein Ventil.' : 'Student saving for a semester abroad. Music is my outlet.',
      { musicGenres: ['mg.pop', 'mg.k-pop', 'mg.r-b'], series: ['Wednesday', 'Heartstopper'], hobbies: ['hb.singing', 'hb.journaling', 'hb.travel'], movieGenres: ['fg.romance', 'fg.comedy'], lookingFor: ['lf.money-talk', 'lf.language-exchange', 'lf.new-friends'], languages: ['ln.german', 'ln.spanish', 'ln.korean'] },
      { level: 6, streak: 8, topAttribute: 'finance' },
      { posts: [{ id: 'p1', video: null, kind: 'tip', text: de ? 'Mein Trick: Jeden Freitag 10 € aufs Sparziel – klein, aber es läppert sich.' : 'My trick: €10 to my savings goal every Friday — small, but it adds up.', attach: null, at: daysAgo(2) }] }),
    mk('demo-kai', 'Kai', 33, 'Köln', de ? 'Papa, Läufer, Gamer am Wochenende. Halbmarathon im Frühjahr.' : 'Dad, runner, weekend gamer. Half marathon in spring.',
      { musicGenres: ['mg.rock', 'mg.hip-hop'], games: ['gm.rpgs', 'gm.soulslike', 'gm.playstation'], sports: ['sp.running', 'sp.football-soccer'], hobbies: ['hb.gaming', 'hb.cooking'], lookingFor: ['lf.running-cycling-group', 'lf.gaming-buddies'], personality: ['ps.funny'] },
      { level: 10, streak: 15, topAttribute: 'fitness' },
      { posts: [{ id: 'p1', video: null, kind: 'buddy', text: de ? 'Suche Laufgruppe in Köln für lange Läufe am Sonntag.' : 'Looking for a running group in Cologne for long Sunday runs.', attach: null, at: daysAgo(3) }] }),
    mk('demo-sam', 'Sam', 26, 'Wien', de ? 'Illustratorin. Zeichne jeden Tag eine Kleinigkeit – 100-Tage-Projekt.' : 'Illustrator. Drawing one small thing a day — 100-day project.',
      { musicGenres: ['mg.ambient', 'mg.lo-fi', 'mg.indie'], hobbies: ['hb.drawing', 'hb.painting', 'hb.comics-manga', 'hb.houseplants'], movieGenres: ['fg.animation', 'fg.anime'], series: ['Arcane'], lookingFor: ['lf.creative-collabs', 'lf.just-chatting'], personality: ['ps.creative-mind', 'ps.calm'] },
      { level: 8, streak: 57, topAttribute: 'creativity' },
      { profile: { accountType: 'creator', creatorCategory: 'creative', handle: 'sam.draws', links: [{ platform: 'instagram', value: 'sam.draws.demo' }] }, posts: [{ id: 'p1', video: null, kind: 'win', text: de ? 'Tag 57 von 100. Heute: eine Monstera in Aquarell.' : 'Day 57 of 100. Today: a monstera in watercolour.', attach: { type: 'level', value: '8' }, at: daysAgo(0, 8) }] }),
  ];
}
