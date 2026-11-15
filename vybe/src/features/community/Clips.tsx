import { useMemo, useState } from 'react';
import { Button, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useCommunity } from '@/community/CommunityContext';
import { useCT } from '@/community/i18n';
import { buildFeed, type FeedItem } from '@/community/model';
import { ClipPlayer, MemberAvatar } from './parts';
import { Comments, Composer, PostActions } from './Feed';
import { useNav } from './nav';

/** Vertical, full-height clip player: one clip per screen, snaps while scrolling. */
export function Clips() {
  const { ct } = useCT();
  const c = useCommunity();
  const [composer, setComposer] = useState(false);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const items = useMemo(() => buildFeed(c.members, c.me).filter((f) => f.post.video), [c.members, c.me]);
  const current = items.find((i) => i.key === commentsFor) ?? null;
  return (
    <div className="mx-auto max-w-md">
      {c.me && c.backend?.canWrite && <Button className="mb-4 w-full" icon="Video" onClick={() => setComposer(true)}>{ct('clip.add')} ≤ 60 s</Button>}
      {items.length === 0 ? (
        <Card><EmptyState icon="Video" title={ct('clip.empty')} text={ct('clip.emptyText')} /></Card>
      ) : (
        <div className="h-[calc(100dvh-14rem)] snap-y snap-mandatory space-y-4 overflow-y-auto rounded-3xl lg:h-[calc(100dvh-12rem)]">
          {items.map((it) => <ClipCard key={it.key} item={it} onComments={() => setCommentsFor(it.key)} />)}
        </div>
      )}
      <Sheet open={composer} onClose={() => setComposer(false)} title={ct('tab.clips')}>
        <Composer clip onDone={() => setComposer(false)} />
      </Sheet>
      <Sheet open={!!current} onClose={() => setCommentsFor(null)} title={ct('feed.comment')}>
        {current && <Comments item={current} />}
      </Sheet>
    </div>
  );
}

function ClipCard({ item, onComments }: { item: FeedItem; onComments: () => void }) {
  const c = useCommunity();
  const nav = useNav();
  return (
    <div className="relative h-full snap-start snap-always overflow-hidden rounded-3xl bg-black">
      <ClipPlayer src={item.post.video!.src} className="h-full w-full" rounded={false} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pr-16 pt-16 text-white">
        <button className="pointer-events-auto flex items-center gap-2" onClick={() => nav.openMember(item.author.id)}>
          <MemberAvatar member={item.author} people={c.people} size={32} />
          <span className="font-semibold">{item.author.profile.nickname}</span>
          {item.author.profile.handle && <span className="text-xs text-white/70">@{item.author.profile.handle}</span>}
        </button>
        {item.post.text && <p className="mt-2 line-clamp-3 text-sm">{item.post.text}</p>}
      </div>
      <div className="absolute bottom-16 right-2 flex flex-col items-center gap-2">
        <PostActions item={item} dark />
        <button onClick={onComments} className="flex flex-col items-center rounded-xl px-3 py-1.5 text-white/85">
          <Icon name="MessageCircle" size={22} /><span className="text-xs num">{item.comments.length || ''}</span>
        </button>
      </div>
    </div>
  );
}
