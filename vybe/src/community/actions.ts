import type { MemberDoc, Post, PostComment } from './types';
import { LIMITS } from './types';
import { uid } from '@/lib/id';

const add = (list: string[], v: string) => (list.includes(v) ? list : [...list, v]);
const del = (list: string[], v: string) => list.filter((x) => x !== v);

/** Pure updates to the viewer's own member document. */
export const act = {
  connect: (id: string) => (d: MemberDoc): MemberDoc => ({ ...d, follows: add(d.follows, id), declined: del(d.declined, id) }),
  disconnect: (id: string) => (d: MemberDoc): MemberDoc => ({ ...d, follows: del(d.follows, id) }),
  decline: (id: string) => (d: MemberDoc): MemberDoc => ({ ...d, declined: add(d.declined, id) }),
  block: (id: string) => (d: MemberDoc): MemberDoc => ({ ...d, blocked: add(d.blocked, id), follows: del(d.follows, id) }),
  unblock: (id: string) => (d: MemberDoc): MemberDoc => ({ ...d, blocked: del(d.blocked, id) }),
  post: (p: Omit<Post, 'id' | 'at'>) => (d: MemberDoc): MemberDoc => ({ ...d, posts: [{ ...p, id: uid('p').slice(0, 40), at: new Date().toISOString() }, ...d.posts].slice(0, LIMITS.posts) }),
  deletePost: (postId: string) => (d: MemberDoc): MemberDoc => ({ ...d, posts: d.posts.filter((p) => p.id !== postId) }),
  toggleLike: (key: string) => (d: MemberDoc): MemberDoc => ({ ...d, likes: d.likes.includes(key) ? del(d.likes, key) : [...d.likes, key].slice(-LIMITS.likes) }),
  comment: (postKey: string, text: string) => (d: MemberDoc): MemberDoc => ({
    ...d,
    comments: [...d.comments, { id: uid('c').slice(0, 40), postKey, text: text.trim().slice(0, LIMITS.comment), at: new Date().toISOString() } as PostComment].slice(-LIMITS.comments),
  }),
  deleteComment: (id: string) => (d: MemberDoc): MemberDoc => ({ ...d, comments: d.comments.filter((c) => c.id !== id) }),
};
