import { Button, Card, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCommunity } from '@/community/CommunityContext';
import { useCT } from '@/community/i18n';
import { buildFeed, followerCount } from '@/community/model';
import { ProfileBody } from './MemberSheet';
import { useNav } from './nav';

export function ProfileTab() {
  const { ct } = useCT();
  const c = useCommunity();
  const nav = useNav();
  const me = c.me;
  if (!me) return <Card><EmptyState icon="User" title={ct('create.title')} text={ct('create.text')} action={c.backend?.canWrite ? <Button icon="Sparkles" onClick={nav.editProfile}>{ct('create.cta')}</Button> : undefined} /></Card>;
  const mine = buildFeed(c.members, me).filter((f) => f.author.id === me.id);
  const stats = [
    { icon: 'Star', label: ct('dash.followers'), value: followerCount(c.members, me.id) },
    { icon: 'Heart', label: ct('dash.likes'), value: mine.reduce((s, f) => s + f.likes, 0) },
    { icon: 'Activity', label: ct('dash.posts'), value: mine.filter((f) => !f.post.video).length },
    { icon: 'Video', label: ct('dash.clips'), value: mine.filter((f) => f.post.video).length },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {me.profile.accountType === 'creator' && (
        <section>
          <SectionHeader title={<span className="flex items-center gap-2"><Icon name="BarChart3" size={16} className="text-accent" />{ct('dash.title')}</span>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name={s.icon} size={13} className="text-accent" />{s.label}</div>
                <div className="mt-1 font-display text-2xl font-bold num">{s.value}</div>
              </Card>
            ))}
          </div>
        </section>
      )}
      <Card>
        <p className="mb-4 text-xs uppercase tracking-wider text-faint">{ct('profile.preview')}</p>
        <ProfileBody member={me} />
        <Button className="mt-5" variant="secondary" icon="Pencil" onClick={nav.editProfile}>{ct('edit')}</Button>
      </Card>
    </div>
  );
}
