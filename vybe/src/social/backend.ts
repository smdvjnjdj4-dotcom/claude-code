import type { Challenge, Friend, Group, VybeData } from '@/domain/types';
import { addDays, todayKey } from '@/lib/date';

/**
 * Social backend contract. The MVP ships `localSocial`, which keeps everything on-device.
 * A future realtime implementation (e.g. WebSocket/Supabase/own server) can implement the same
 * interface plus `subscribe` without changing the UI.
 */
export interface SocialBackend {
  readonly kind: 'local' | 'remote';
  addFriend(d: VybeData, name: string): VybeData;
  removeFriend(d: VybeData, id: string): VybeData;
  createGroup(d: VybeData, name: string, memberIds: string[]): VybeData;
  deleteGroup(d: VybeData, id: string): VybeData;
  createChallenge(d: VybeData, c: Omit<Challenge, 'id' | 'participants' | 'kind' | 'joined' | 'startDate' | 'endDate'> & { lengthDays: number }): VybeData;
  setJoined(d: VybeData, id: string, joined: boolean): VybeData;
  deleteChallenge(d: VybeData, id: string): VybeData;
  subscribe?(onChange: (d: Partial<VybeData>) => void): () => void;
}

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export const localSocial: SocialBackend = {
  kind: 'local',
  addFriend: (d, name) => ({ ...d, friends: [...d.friends, { id: id('f'), name, addedAt: new Date().toISOString(), kind: 'local' } as Friend] }),
  removeFriend: (d, fid) => ({ ...d, friends: d.friends.filter((f) => f.id !== fid), groups: d.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((m) => m !== fid) })) }),
  createGroup: (d, name, memberIds) => ({ ...d, groups: [...d.groups, { id: id('g'), name, memberIds, createdAt: new Date().toISOString() } as Group] }),
  deleteGroup: (d, gid) => ({ ...d, groups: d.groups.filter((g) => g.id !== gid) }),
  createChallenge: (d, c) => {
    const start = todayKey();
    const { lengthDays, ...rest } = c;
    const ch: Challenge = { ...rest, id: id('c'), startDate: start, endDate: addDays(start, lengthDays - 1), joined: true, kind: 'local', participants: [] };
    return { ...d, challenges: [ch, ...d.challenges] };
  },
  setJoined: (d, cid, joined) => ({ ...d, challenges: d.challenges.map((c) => (c.id === cid ? { ...c, joined } : c)) }),
  deleteChallenge: (d, cid) => ({ ...d, challenges: d.challenges.filter((c) => c.id !== cid) }),
};

/** Your real progress in a challenge: distinct days in the window with XP in the challenge attribute. */
export function challengeProgress(d: VybeData, c: Challenge): number {
  const end = c.endDate < todayKey() ? c.endDate : todayKey();
  const days = new Set(d.ledger.filter((e) => e.attribute === c.attribute && e.date >= c.startDate && e.date <= end).map((e) => e.date));
  return days.size;
}
