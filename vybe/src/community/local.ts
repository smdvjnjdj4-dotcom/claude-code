import { createStore, get, set } from 'idb-keyval';
import { useVybe } from '@/store/useVybe';
import type { CommunityBackend, Collection, RawDoc } from './backend';
import { demoMembers, LOCAL_ME } from './demo';
import { uid } from '@/lib/id';

let media: ReturnType<typeof createStore> | null = null;
const mediaStore = () => (media ??= createStore('vybe-media', 'videos'));
const urlCache = new Map<string, string>();

/** Write a document as another (demo) member — only the local demo bots use this. */
export function writeLocalAs(col: Collection, id: string, data: Record<string, unknown>) {
  useVybe.getState().setCommunityDocs((d) => ({ ...d, [`${col}/${id}`]: data }));
}

export function localBackend(): CommunityBackend {
  const docsFor = (col: Collection): RawDoc[] => {
    const s = useVybe.getState();
    const all = s.communityDocs ?? {};
    const own = Object.entries(all).filter(([k]) => k.startsWith(`${col}/`)).map(([k, data]) => ({ id: k.slice(col.length + 1), data }));
    if (col !== 'members') return own;
    const demos = demoMembers(s.settings.lang).map((m) => {
      const { id, demo: _demo, ...doc } = m;
      return { id, data: doc };
    });
    return [...own, ...demos];
  };
  return {
    mode: 'local',
    meId: LOCAL_ME,
    canWrite: true,
    isModerator: false,
    canUpload: typeof indexedDB !== 'undefined',
    subscribe(col, onDocs, onStatus) {
      onDocs(docsFor(col));
      onStatus?.('ready');
      return useVybe.subscribe((s, prev) => {
        if (s.communityDocs !== prev.communityDocs || s.settings.lang !== prev.settings.lang) onDocs(docsFor(col));
      });
    },
    async write(col, data) { writeLocalAs(col, LOCAL_ME, data); },
    async remove(col) { useVybe.getState().setCommunityDocs((d) => { const n = { ...d }; delete n[`${col}/${LOCAL_ME}`]; return n; }); },
    async getPrivate(key) { return (useVybe.getState().communityDocs[`private/${key}`] as Record<string, unknown>) ?? null; },
    async setPrivate(key, data) { useVybe.getState().setCommunityDocs((d) => ({ ...d, [`private/${key}`]: data })); },
    async uploadVideo(file) {
      const id = `loc_${uid().replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`;
      await set(id, file, mediaStore());
      return id;
    },
    async videoUrl(src) {
      if (urlCache.has(src)) return urlCache.get(src)!;
      const blob = await get<Blob>(src, mediaStore()).catch(() => undefined);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(src, url);
      return url;
    },
  };
}
