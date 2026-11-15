import type { Member, MemberDoc } from './types';
import { parseMember, toDoc } from './model';

export type SyncStatus = 'loading' | 'ready' | 'stale' | 'error';

/**
 * Where community data lives.
 *  - `live`: the shared database of the published VYBE link (everyone who opens it sees the same
 *    profiles, posts and connections in real time). Each person writes only their own document;
 *    the link's owner may moderate.
 *  - `local`: the standalone app has no community server yet; your profile stays on this device and
 *    the other members are clearly labelled demo profiles.
 */
export interface CommunityBackend {
  mode: 'live' | 'local';
  meId: string | null;
  canWrite: boolean;
  isModerator: boolean;
  subscribe(onMembers: (m: Member[]) => void, onStatus: (s: SyncStatus) => void): () => void;
  saveMine(doc: MemberDoc): Promise<void>;
  deleteMine(): Promise<void>;
  moderateRemovePost?(author: Member, postId: string): Promise<void>;
  /** Account display data for members (live mode only); never stored. */
  people?(ids: string[]): Promise<Record<string, { name: string; avatarUrl: string }>>;
}

// Minimal structural types for the viewer runtime (see the artifact capability contract).
type Unsub = () => void;
interface DocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined; metadata: { fromCache: boolean } }
interface DocRef { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
interface DbApi {
  doc(path: string): DocRef;
  collection(path: string): { onSnapshot(next: (s: { docs: DocSnap[]; metadata: { fromCache: boolean } }) => void, err?: (e: { code: string }) => void): Unsub };
}
interface UserApi {
  id(): Promise<string | null>;
  isOwner(): Promise<boolean>;
  can(name: string): Promise<boolean | null>;
  profiles(ids: string[]): Promise<Record<string, { name: string; avatarUrl: string }>>;
}
interface ClaudeRuntime { use(name: string): Promise<unknown> }

const COLLECTION = 'members';

/** Serialises writes to one document and coalesces bursts: only the newest pending state is written. */
function writer(ref: DocRef) {
  let running: Promise<void> | null = null;
  let pending: MemberDoc | null = null;
  const pump = async (): Promise<void> => {
    while (pending) {
      const next = pending;
      pending = null;
      await ref.set(toDoc(next) as unknown as Record<string, unknown>);
    }
  };
  return (doc: MemberDoc) => {
    pending = doc;
    if (!running) running = pump().finally(() => { running = null; });
    return running;
  };
}

export async function connectLive(): Promise<CommunityBackend | null> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!rt?.use) return null;
  const [db, user] = (await Promise.all([rt.use('db'), rt.use('user')])) as [DbApi | null, UserApi | null];
  if (!db || !user) return null;
  const [meId, owner, can] = await Promise.all([user.id(), user.isOwner(), user.can('data.write')]);
  const myRef = meId ? db.doc(`${COLLECTION}/${meId}`) : null;
  const write = myRef ? writer(myRef) : null;
  let latest: Member[] = [];
  return {
    mode: 'live',
    meId,
    canWrite: !!meId && can !== false,
    isModerator: owner,
    subscribe(onMembers, onStatus) {
      onStatus('loading');
      const timer = setTimeout(() => onStatus('stale'), 10_000);
      const unsub = db.collection(COLLECTION).onSnapshot(
        (snap) => {
          latest = snap.docs.filter((d) => d.exists).map((d) => parseMember(d.id, d.data())).filter((m): m is Member => !!m);
          onMembers(latest);
          if (!snap.metadata.fromCache) { clearTimeout(timer); onStatus('ready'); }
        },
        () => { clearTimeout(timer); onStatus('error'); },
      );
      return () => { clearTimeout(timer); unsub(); };
    },
    async saveMine(doc) {
      if (!write) throw new Error('read_only');
      await write(doc);
    },
    async deleteMine() {
      if (myRef) await myRef.delete();
    },
    async moderateRemovePost(author, postId) {
      if (!owner) return;
      const fresh = latest.find((m) => m.id === author.id) ?? author;
      await db.doc(`${COLLECTION}/${author.id}`).set(toDoc({ ...fresh, posts: fresh.posts.filter((p) => p.id !== postId) }) as unknown as Record<string, unknown>);
    },
    people: (ids) => user.profiles(ids),
  };
}

/** The capability declaration the published link needs: everyone reads members, each writes only their own. */
export const LIVE_CAPABILITIES = {
  db: { rules: [ { path: COLLECTION, read: 'view', write: 'owner' }, { path: `${COLLECTION}/{self}`, read: 'view', write: 'interact' } ] },
  user: { scopes: ['profile'] },
};
