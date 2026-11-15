import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVybe } from '@/store/useVybe';
import { connectLive, type CommunityBackend, type SyncStatus } from './backend';
import { demoMembers, LOCAL_ME } from './demo';
import { relation, toDoc } from './model';
import type { Member, MemberDoc } from './types';
import { todayKey } from '@/lib/date';

let livePromise: Promise<CommunityBackend | null> | null = null;
function getLive() {
  if (!livePromise) livePromise = connectLive().catch(() => null);
  return livePromise;
}

function localBackend(): CommunityBackend {
  return {
    mode: 'local',
    meId: LOCAL_ME,
    canWrite: true,
    isModerator: false,
    subscribe(onMembers, onStatus) {
      const emit = () => {
        const s = useVybe.getState();
        const mine = s.community ? [{ ...s.community, id: LOCAL_ME }] : [];
        onMembers([...mine, ...demoMembers(s.settings.lang)]);
      };
      emit();
      onStatus('ready');
      return useVybe.subscribe((s, prev) => { if (s.community !== prev.community || s.settings.lang !== prev.settings.lang) emit(); });
    },
    async saveMine(doc) { useVybe.getState().setCommunityDoc(toDoc(doc)); },
    async deleteMine() { useVybe.getState().setCommunityDoc(null); },
  };
}

export interface CommunityState {
  backend: CommunityBackend | null;
  status: SyncStatus;
  members: Member[];
  me: Member | null;
  save: (fn: (doc: MemberDoc) => MemberDoc) => Promise<boolean>;
  create: (doc: MemberDoc) => Promise<boolean>;
  people: Record<string, { name: string; avatarUrl: string }>;
}

/**
 * Connects to the live community when running inside the shared VYBE link, otherwise to the local one.
 * Subscribes once; all views derive from the member list.
 */
export function useCommunity(): CommunityState {
  const [backend, setBackend] = useState<CommunityBackend | null>(null);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [members, setMembers] = useState<Member[]>([]);
  const [people, setPeople] = useState<CommunityState['people']>({});
  const { toast, communityReward, lang } = useVybe(useShallow((s) => ({ toast: s.toast, communityReward: s.communityReward, lang: s.settings.lang })));
  const optimistic = useRef<Member | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    const hasRuntime = !!(window as unknown as { claude?: unknown }).claude;
    (hasRuntime ? getLive() : Promise.resolve(null)).then((live) => {
      if (cancelled) return;
      const b = live ?? localBackend();
      setBackend(b);
      unsub = b.subscribe((m) => { optimistic.current = null; setMembers(m); }, setStatus);
    });
    return () => { cancelled = true; unsub?.(); };
  }, []);

  const idsKey = members.map((m) => m.id).join(',');
  useEffect(() => {
    if (!backend?.people || !idsKey) return;
    backend.people(idsKey.split(',')).then(setPeople).catch(() => undefined);
  }, [backend, idsKey]);

  const meFromList = backend?.meId ? members.find((m) => m.id === backend.meId) ?? null : null;
  const me = optimistic.current ?? meFromList;

  // Reward each new mutual connection once (idempotent ledger key).
  useEffect(() => {
    if (!me) return;
    for (const m of members) if (!m.demo || backend?.mode === 'local') if (relation(me, m) === 'connected') communityReward(`connect:${m.id}`, 15, 'community:connect');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, me?.follows.join(',')]);

  const save = useCallback(async (fn: (doc: MemberDoc) => MemberDoc) => {
    if (!backend?.canWrite || !backend.meId) return false;
    const current = optimistic.current ?? members.find((m) => m.id === backend.meId);
    if (!current) return false;
    return write(current, fn(current));
  }, [backend, members]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(async (doc: MemberDoc) => {
    if (!backend?.canWrite || !backend.meId) return false;
    return write(null, doc);
  }, [backend]); // eslint-disable-line react-hooks/exhaustive-deps

  async function write(current: Member | null, next: MemberDoc): Promise<boolean> {
    if (!backend?.meId) return false;
    const id = backend.meId;
    const prevPosts = current?.posts.length ?? 0;
    optimistic.current = { ...next, id };
    setMembers((ms) => (ms.some((m) => m.id === id) ? ms.map((m) => (m.id === id ? optimistic.current! : m)) : [optimistic.current!, ...ms]));
    try {
      await backend.saveMine(next);
      if (next.posts.length > prevPosts) communityReward(`post:${todayKey()}`, 10, 'community:post');
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === 'quota_exceeded' ? (lang === 'de' ? 'Speicher der Community ist voll.' : 'Community storage is full.') : (lang === 'de' ? 'Speichern fehlgeschlagen. Bitte erneut versuchen.' : 'Saving failed. Please try again.'), 'err');
      return false;
    }
  }

  return useMemo(() => ({ backend, status, members, me, save, create, people }), [backend, status, members, me, save, create, people]);
}
