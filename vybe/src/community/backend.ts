export type SyncStatus = 'loading' | 'ready' | 'stale' | 'error';
export type Collection = 'members' | 'outbox' | 'games';
export const COLLECTIONS: Collection[] = ['members', 'outbox', 'games'];
export interface RawDoc { id: string; data: unknown }

/**
 * Where community data lives.
 *  - `live`: the shared database of the published VYBE link. Everyone who opens it sees the same
 *    profiles, posts, clips, games and (encrypted) messages in real time. Each person writes only
 *    their own document in each collection; the link's owner may moderate posts.
 *  - `local`: the standalone app has no community server yet; your data stays on this device and
 *    the other members are clearly labelled demo profiles (with simple automatic replies and moves).
 */
export interface CommunityBackend {
  mode: 'live' | 'local';
  meId: string | null;
  canWrite: boolean;
  isModerator: boolean;
  /** True when this viewer may upload videos. */
  canUpload: boolean;
  subscribe(col: Collection, onDocs: (docs: RawDoc[]) => void, onStatus?: (s: SyncStatus) => void): () => void;
  write(col: Collection, data: Record<string, unknown>): Promise<void>;
  remove(col: Collection): Promise<void>;
  moderateWrite?(col: Collection, id: string, data: Record<string, unknown>): Promise<void>;
  /** Private per-person storage (message keys). Never visible to others. */
  getPrivate(key: string): Promise<Record<string, unknown> | null>;
  setPrivate(key: string, data: Record<string, unknown>): Promise<void>;
  uploadVideo(file: Blob): Promise<string>;
  videoUrl(src: string): Promise<string | null>;
  people?(ids: string[]): Promise<Record<string, { name: string; avatarUrl: string }>>;
}

// Minimal structural types for the viewer runtime (artifact capability contract 0.2.x).
type Unsub = () => void;
interface DocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined; metadata: { fromCache: boolean } }
interface DocRef { set(d: Record<string, unknown>): Promise<void>; get(): Promise<DocSnap>; delete(): Promise<void> }
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
interface AssetsApi { upload(b: Blob): Promise<{ id: string; url: string }> }
interface ClaudeRuntime { use(name: string): Promise<unknown> }

/** Serialises writes to one document and coalesces bursts: only the newest pending state is written. */
export function serialWriter(set: (d: Record<string, unknown>) => Promise<void>) {
  let running: Promise<void> | null = null;
  let pending: Record<string, unknown> | null = null;
  const pump = async () => {
    while (pending) {
      const next = pending;
      pending = null;
      await set(next);
    }
  };
  return (doc: Record<string, unknown>) => {
    pending = doc;
    if (!running) running = pump().finally(() => { running = null; });
    return running;
  };
}

export async function connectLive(): Promise<CommunityBackend | null> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!rt?.use) return null;
  const [db, user, assets] = (await Promise.all([rt.use('db'), rt.use('user'), rt.use('assets')])) as [DbApi | null, UserApi | null, AssetsApi | null];
  if (!db || !user) return null;
  const [meId, owner, can] = await Promise.all([user.id(), user.isOwner(), user.can('data.write')]);
  const writers = new Map<Collection, (d: Record<string, unknown>) => Promise<void>>();
  const writerFor = (col: Collection) => {
    let w = writers.get(col);
    if (!w) { w = serialWriter((d) => db.doc(`${col}/${meId}`).set(d)); writers.set(col, w); }
    return w;
  };
  return {
    mode: 'live',
    meId,
    canWrite: !!meId && can !== false,
    isModerator: owner,
    canUpload: !!assets,
    subscribe(col, onDocs, onStatus) {
      onStatus?.('loading');
      const timer = setTimeout(() => onStatus?.('stale'), 10_000);
      const unsub = db.collection(col).onSnapshot(
        (snap) => {
          onDocs(snap.docs.filter((d) => d.exists).map((d) => ({ id: d.id, data: d.data() })));
          if (!snap.metadata.fromCache) { clearTimeout(timer); onStatus?.('ready'); }
        },
        () => { clearTimeout(timer); onStatus?.('error'); },
      );
      return () => { clearTimeout(timer); unsub(); };
    },
    async write(col, data) {
      if (!meId) throw new Error('read_only');
      await writerFor(col)(data);
    },
    async remove(col) { if (meId) await db.doc(`${col}/${meId}`).delete(); },
    async moderateWrite(col, id, data) { if (owner) await db.doc(`${col}/${id}`).set(data); },
    async getPrivate(key) {
      if (!meId) return null;
      const s = await db.doc(`data/users/${meId}/${key}`).get();
      return s.exists ? s.data() ?? null : null;
    },
    async setPrivate(key, data) { if (meId) await db.doc(`data/users/${meId}/${key}`).set(data); },
    async uploadVideo(file) {
      if (!assets) throw Object.assign(new Error('not_granted'), { code: 'not_granted' });
      return (await assets.upload(file)).id;
    },
    async videoUrl(src) { return `/_blob/${src}`; },
    people: (ids) => user.profiles(ids),
  };
}

/** Capability declaration for the published link: everyone reads, each person writes only their own document. */
export const LIVE_CAPABILITIES = {
  db: {
    rules: COLLECTIONS.flatMap((c) => [
      { path: c, read: 'view', write: 'owner' },
      { path: `${c}/{self}`, read: 'view', write: 'interact' },
    ]),
  },
  user: { scopes: ['profile'] },
  assets: { upload: 'interact' },
};
