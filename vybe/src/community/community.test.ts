import { describe, expect, it } from 'vitest';
import { buildFeed, emptyMemberDoc, emptyProfile, matchMembers, parseMember, relation } from './model';
import { act } from './actions';
import { OPTIONS } from './options';
import { demoMembers } from './demo';
import type { Member } from './types';

const member = (id: string, patch: Partial<Member['profile']['interests']> = {}, age = 25): Member => {
  const p = emptyProfile(id.toUpperCase());
  return { ...emptyMemberDoc({ ...p, age, interests: { ...p.interests, ...patch } }), id };
};

describe('community model', () => {
  it('option ids are unique', () => {
    const ids = Object.values(OPTIONS).flatMap((l) => l!.map((o) => o[0]));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('demo members only reference existing option ids', () => {
    const ids = new Set(Object.values(OPTIONS).flatMap((l) => l!.map((o) => o[0])));
    for (const m of demoMembers('de')) for (const [k, vals] of Object.entries(m.profile.interests)) {
      if (['artists', 'movies', 'series', 'books'].includes(k)) continue;
      for (const v of vals) expect(ids.has(v), `${m.id} ${v}`).toBe(true);
    }
  });
  it('rejects or sanitises untrusted documents', () => {
    expect(parseMember('x', null)).toBeNull();
    expect(parseMember('x', { profile: { nickname: 'a' } })).toBeNull();
    const m = parseMember('x', { profile: { nickname: '  Nova  ', age: 12, bio: 'b'.repeat(999), interests: { hobbies: ['hb.reading', 42, 'x'.repeat(100)] } }, posts: [{ id: 'p', text: '' }, { id: 'q', text: 'hi', kind: 'evil' }], follows: 'nope' })!;
    expect(m.profile.nickname).toBe('Nova');
    expect(m.profile.age).toBeNull(); // under 16 is not accepted
    expect(m.profile.bio.length).toBe(300);
    expect(m.profile.interests.hobbies).toEqual(['hb.reading', 'x'.repeat(40)]);
    expect(m.posts).toHaveLength(1);
    expect(m.posts[0].kind).toBe('update');
    expect(m.follows).toEqual([]);
  });
  it('matches on shared interests, case-insensitively for custom entries', () => {
    const a = member('a', { musicGenres: ['mg.techno', 'mg.house'], artists: ['Daft Punk'], lookingFor: ['lf.workout-buddy'] }, 25);
    const b = member('b', { musicGenres: ['mg.techno'], artists: ['daft  punk'], lookingFor: ['lf.workout-buddy'] }, 26);
    const c = member('c', { musicGenres: ['mg.schlager'] }, 60);
    const ab = matchMembers(a.profile, b.profile);
    expect(ab.common.map((x) => x.value).sort()).toEqual(['Daft Punk', 'lf.workout-buddy', 'mg.techno']);
    expect(ab.score).toBeGreaterThan(matchMembers(a.profile, c.profile).score);
    expect(matchMembers(a.profile, c.profile).score).toBe(0);
  });
  it('connections need both sides; block hides both ways', () => {
    let a = member('a');
    let b = member('b');
    a = { ...act.connect('b')(a), id: 'a' };
    expect(relation(a, b)).toBe('requested');
    expect(relation(b, a)).toBe('incoming');
    b = { ...act.connect('a')(b), id: 'b' };
    expect(relation(a, b)).toBe('connected');
    b = { ...act.block('a')(b), id: 'b' };
    expect(relation(a, b)).toBe('blocked');
    expect(relation(b, a)).toBe('blocked');
  });
  it('builds the feed with aggregated likes and comments, hiding blocked authors', () => {
    let a = member('a');
    let b = member('b');
    const c = { ...member('c'), blocked: ['a'] };
    a = { ...act.post({ kind: 'win', text: 'Hello', attach: null })(a), id: 'a' };
    const key = `a:${a.posts[0].id}`;
    b = { ...act.comment(key, 'Nice!')(act.toggleLike(key)(b)), id: 'b' };
    const feed = buildFeed([a, b, c], b);
    expect(feed).toHaveLength(1);
    expect(feed[0].likes).toBe(1);
    expect(feed[0].likedByMe).toBe(true);
    expect(feed[0].comments[0].comment.text).toBe('Nice!');
    expect(buildFeed([a, b, c], c)).toHaveLength(0);
  });
});
