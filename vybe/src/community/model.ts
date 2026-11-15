import { ATTRIBUTES, type Attribute } from '@/domain/types';
import { INTEREST_KEYS, LIMITS, type CommunityProfile, type InterestKey, type Member, type MemberDoc, type Post, type PostComment, type PostKind } from './types';
import { normInterest } from './options';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = <T>(v: unknown, map: (x: unknown) => T | null, max: number): T[] => (Array.isArray(v) ? v.map(map).filter((x): x is T => x !== null).slice(0, max) : []);
const iso = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date(0).toISOString());
const KINDS: PostKind[] = ['update', 'win', 'question', 'tip', 'buddy'];

export function emptyInterests(): Record<InterestKey, string[]> {
  return Object.fromEntries(INTEREST_KEYS.map((k) => [k, []])) as unknown as Record<InterestKey, string[]>;
}

export function emptyProfile(nickname = ''): CommunityProfile {
  return { nickname, age: null, showAge: true, city: '', pronouns: '', bio: '', interests: emptyInterests(), discoverable: true, shareStats: true, stats: null, updatedAt: new Date().toISOString() };
}

export function emptyMemberDoc(profile: CommunityProfile): MemberDoc {
  return { v: 1, profile, posts: [], likes: [], comments: [], follows: [], declined: [], blocked: [] };
}

/**
 * Other members' documents are untrusted input. Coerce everything into the expected shape with limits,
 * drop anything else. Returns null when the document cannot be a profile.
 */
export function parseMember(id: string, raw: unknown): Member | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const p = (d.profile ?? {}) as Record<string, unknown>;
  const nickname = str(p.nickname, LIMITS.nickname[1]);
  if (nickname.length < LIMITS.nickname[0]) return null;
  const age = typeof p.age === 'number' && Number.isInteger(p.age) && p.age >= LIMITS.minAge && p.age <= LIMITS.maxAge ? p.age : null;
  const rawInterests = (p.interests ?? {}) as Record<string, unknown>;
  const interests = emptyInterests();
  for (const k of INTEREST_KEYS) interests[k] = [...new Set(arr(rawInterests[k], (x) => str(x, LIMITS.tag) || null, LIMITS.tagsPerKey))];
  const s = p.stats as Record<string, unknown> | null;
  const stats = s && typeof s.level === 'number' && typeof s.streak === 'number' && ATTRIBUTES.includes(s.topAttribute as never)
    ? { level: Math.max(1, Math.min(999, Math.floor(s.level))), streak: Math.max(0, Math.min(9999, Math.floor(s.streak))), topAttribute: s.topAttribute as Attribute }
    : null;
  const profile: CommunityProfile = {
    nickname, age, showAge: p.showAge !== false, city: str(p.city, LIMITS.city), pronouns: str(p.pronouns, LIMITS.pronouns), bio: str(p.bio, LIMITS.bio),
    interests, discoverable: p.discoverable !== false, shareStats: p.shareStats !== false, stats, updatedAt: iso(p.updatedAt),
  };
  const posts = arr<Post>(d.posts, (x) => {
    const q = x as Record<string, unknown>;
    if (!q || typeof q.id !== 'string' || !str(q.text, LIMITS.post)) return null;
    const a = q.attach as Record<string, unknown> | null;
    const attach = a && ['level', 'streak', 'achievement'].includes(a.type as string) ? { type: a.type as 'level', value: str(a.value, 60) } : null;
    return { id: str(q.id, 64), kind: KINDS.includes(q.kind as PostKind) ? (q.kind as PostKind) : 'update', text: str(q.text, LIMITS.post), attach, at: iso(q.at) };
  }, LIMITS.posts);
  const comments = arr<PostComment>(d.comments, (x) => {
    const c = x as Record<string, unknown>;
    if (!c || typeof c.id !== 'string' || typeof c.postKey !== 'string' || !str(c.text, LIMITS.comment)) return null;
    return { id: str(c.id, 64), postKey: str(c.postKey, 200), text: str(c.text, LIMITS.comment), at: iso(c.at) };
  }, LIMITS.comments);
  const ids = (v: unknown) => [...new Set(arr(v, (x) => (typeof x === 'string' && x.length < 200 ? x : null), 1000))];
  return { id, v: 1, profile, posts, comments, likes: ids(d.likes).slice(0, LIMITS.likes), follows: ids(d.follows), declined: ids(d.declined), blocked: ids(d.blocked) };
}

/** Strip a member to the storable document (no id/demo flags). */
export function toDoc(m: MemberDoc): MemberDoc {
  return { v: 1, profile: m.profile, posts: m.posts.slice(0, LIMITS.posts), likes: m.likes.slice(-LIMITS.likes), comments: m.comments.slice(-LIMITS.comments), follows: m.follows, declined: m.declined, blocked: m.blocked };
}

// ---------------------------------------------------------------- matching

const WEIGHTS: Record<InterestKey, number> = {
  musicGenres: 2, artists: 3, movieGenres: 1.5, movies: 2.5, series: 2.5, hobbies: 2, sports: 2, games: 1.5, books: 2.5, languages: 1, personality: 1, lookingFor: 3,
};

export interface Match {
  score: number; // 0..100
  common: { key: InterestKey; value: string }[];
}

/** Interest-overlap score. Rare, specific overlaps (artists, shows, what you're looking for) weigh more than broad ones. */
export function matchMembers(a: CommunityProfile, b: CommunityProfile): Match {
  const common: Match['common'] = [];
  let points = 0;
  let possible = 0;
  for (const k of INTEREST_KEYS) {
    const A = new Map(a.interests[k].map((v) => [normInterest(v), v]));
    const B = new Set(b.interests[k].map(normInterest));
    if (A.size && B.size) possible += WEIGHTS[k] * Math.min(A.size, B.size, 5);
    for (const [n, original] of A) if (B.has(n)) { common.push({ key: k, value: original }); points += WEIGHTS[k]; }
  }
  if (a.age && b.age) {
    const gap = Math.abs(a.age - b.age);
    possible += 2;
    points += gap <= 3 ? 2 : gap <= 7 ? 1 : 0;
  }
  const score = possible ? Math.round(Math.min(1, points / possible) * 100) : 0;
  return { score, common };
}

// ---------------------------------------------------------------- relations

export type Relation = 'self' | 'connected' | 'requested' | 'incoming' | 'none' | 'blocked';

export function relation(me: Member | null, other: Member): Relation {
  if (!me) return 'none';
  if (me.id === other.id) return 'self';
  if (me.blocked.includes(other.id) || other.blocked.includes(me.id)) return 'blocked';
  const iFollow = me.follows.includes(other.id);
  const theyFollow = other.follows.includes(me.id);
  if (iFollow && theyFollow) return 'connected';
  if (iFollow) return 'requested';
  if (theyFollow && !me.declined.includes(other.id)) return 'incoming';
  return 'none';
}

export const postKey = (authorId: string, postId: string) => `${authorId}:${postId}`;

export interface FeedItem {
  author: Member;
  post: Post;
  key: string;
  likes: number;
  likedByMe: boolean;
  comments: { author: Member; comment: PostComment }[];
}

/** Assemble the feed from all member documents: posts, aggregated likes and threaded comments. */
export function buildFeed(members: Member[], me: Member | null): FeedItem[] {
  const visible = members.filter((m) => relation(me, m) !== 'blocked');
  const likeCount = new Map<string, number>();
  for (const m of visible) for (const k of m.likes) likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
  const commentsBy = new Map<string, { author: Member; comment: PostComment }[]>();
  for (const m of visible) for (const c of m.comments) {
    const list = commentsBy.get(c.postKey) ?? [];
    list.push({ author: m, comment: c });
    commentsBy.set(c.postKey, list);
  }
  const items: FeedItem[] = [];
  for (const m of visible) {
    const rel = relation(me, m);
    if (!m.profile.discoverable && rel !== 'self' && rel !== 'connected') continue;
    for (const p of m.posts) {
      const key = postKey(m.id, p.id);
      items.push({ author: m, post: p, key, likes: likeCount.get(key) ?? 0, likedByMe: !!me?.likes.includes(key), comments: (commentsBy.get(key) ?? []).sort((x, y) => x.comment.at.localeCompare(y.comment.at)) });
    }
  }
  return items.sort((a, b) => b.post.at.localeCompare(a.post.at));
}
