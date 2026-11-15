import type { Attribute } from '@/domain/types';

/** Interest categories on a community profile. Predefined values are option ids (e.g. "mg.techno"); custom entries are free text. */
export const INTEREST_KEYS = ['musicGenres', 'artists', 'movieGenres', 'movies', 'series', 'hobbies', 'sports', 'games', 'books', 'languages', 'personality', 'lookingFor'] as const;
export type InterestKey = (typeof INTEREST_KEYS)[number];

export interface CommunityProfile {
  nickname: string;
  age: number | null;
  showAge: boolean;
  city: string;
  pronouns: string;
  bio: string;
  interests: Record<InterestKey, string[]>;
  /** Shown in discovery. When false, only existing connections see the profile. */
  discoverable: boolean;
  /** Share level / streak / strongest attribute on the profile. */
  shareStats: boolean;
  stats: { level: number; streak: number; topAttribute: Attribute } | null;
  updatedAt: string;
}

export type PostKind = 'update' | 'win' | 'question' | 'tip' | 'buddy';

export interface Post {
  id: string;
  kind: PostKind;
  text: string;
  /** Optional attached progress snapshot, written by the author. */
  attach: { type: 'level' | 'streak' | 'achievement'; value: string } | null;
  at: string;
}

export interface PostComment {
  id: string;
  /** `${authorId}:${postId}` of the post being answered */
  postKey: string;
  text: string;
  at: string;
}

/** Everything one member writes. One document per member: they only ever write their own. */
export interface MemberDoc {
  v: 1;
  profile: CommunityProfile;
  posts: Post[];
  likes: string[]; // postKeys
  comments: PostComment[];
  follows: string[]; // member ids this member wants to connect with
  declined: string[];
  blocked: string[];
}

export interface Member extends MemberDoc {
  id: string;
  demo?: boolean;
}

export const LIMITS = {
  nickname: [2, 24],
  bio: 300,
  city: 40,
  pronouns: 20,
  tag: 40,
  tagsPerKey: 25,
  post: 500,
  comment: 280,
  posts: 40,
  comments: 150,
  likes: 500,
  minAge: 16,
  maxAge: 99,
} as const;
