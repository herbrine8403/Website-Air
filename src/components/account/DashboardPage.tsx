import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Download,
  MessageSquare,
  Heart,
  Upload,
  Settings as SettingsIcon,
  ArrowRight,
  MessageCircle,
  PenLine,
  Mail,
  Github,
  Tv as Bilibili,
  Loader2,
  AlertCircle,
  Compass,
  Shield,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth, type AuthUser } from '@/hooks/useAuth';

interface DashboardResource {
  id: string | number;
  title: string;
  name?: string;
  slug?: string;
  type?: string;
  category?: string;
  downloads_count?: number;
  downloads?: number;
  updated_at?: string;
  created_at?: string;
}

interface DashboardActivity {
  id: string | number;
  type: 'resource' | 'topic' | 'article' | 'question' | 'reply' | 'answer' | string;
  title?: string;
  text?: string;
  link?: string;
  link_text?: string;
  created_at?: string;
  time?: string;
  icon?: 'green' | 'purple' | 'orange' | 'blue' | 'red';
}

interface DashboardData {
  success: boolean;
  user?: AuthUser;
  stats?: {
    resources_count: number;
    total_downloads: number;
    forum_posts_count?: number;
    forum_posts?: number;
    total_likes: number;
  };
  recent_activities?: DashboardActivity[];
  activities?: DashboardActivity[];
  my_resources?: DashboardResource[];
  resources?: DashboardResource[];
}

function formatNumber(n: number): string {
  if (!n && n !== 0) return '0';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('zh-CN');
}

function formatDownloads(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatRelativeTime(time: string): string {
  // 简单相对时间格式化。如果 time 已经是 "X 小时前" 格式则直接返回。
  if (/[前后]$/.test(time)) return time;
  try {
    const dt = new Date(time);
    const now = Date.now();
    const diff = Math.max(0, now - dt.getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小时前`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} 天前`;
    const wk = Math.floor(day / 7);
    if (wk < 5) return `${wk} 周前`;
    return dt.toLocaleDateString('zh-CN');
  } catch {
    return time;
  }
}

function getInitials(name: string): string {
  if (!name) return 'U';
  return name.slice(0, 2).toUpperCase();
}

export default function DashboardPage() {
  const { user: authUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<DashboardData>('/account/dashboard.php');
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载控制台数据失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const user = data?.user ?? authUser;
  const stats = data?.stats ?? { resources_count: 0, total_downloads: 0, forum_posts_count: 0, total_likes: 0 };
  const forumPostsCount = stats.forum_posts_count ?? stats.forum_posts ?? 0;
  const activities = data?.recent_activities ?? data?.activities ?? [];
  const resources = (data?.my_resources ?? data?.resources ?? []).slice(0, 5);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={20} />
        加载中...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: 'var(--destructive)',
          }}
          role="alert"
        >
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
    : '';

  const statCards = [
    { icon: Package, label: '我的资源', value: formatNumber(stats.resources_count), suffix: '个' },
    { icon: Download, label: '总下载量', value: formatDownloads(stats.total_downloads), suffix: '' },
    { icon: MessageSquare, label: '论坛帖子', value: formatNumber(forumPostsCount), suffix: '' },
    { icon: Heart, label: '获赞总数', value: formatNumber(stats.total_likes), suffix: '' },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-20">
      {/* 顶部欢迎区 */}
      <section
        className="flex items-center justify-between gap-6 flex-wrap p-6 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, var(--brand-100) 0%, var(--brand-200) 100%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-5 flex-wrap">
          <div
            className="flex items-center justify-center font-bold flex-shrink-0"
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: 'var(--accent-blue-foreground)',
              fontSize: 28,
              border: '4px solid var(--background)',
              boxShadow: 'var(--shadow-md)',
              backgroundImage: user?.avatar_url ? `url(${user.avatar_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!user?.avatar_url && getInitials(user?.username || 'U')}
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                lineHeight: 1.1,
                color: 'var(--foreground)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              {user?.username || '用户'}
            </div>
            {joinedDate && (
              <div className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {joinedDate}加入 Air 社区
              </div>
            )}
            <div className="mt-2.5 flex gap-2 flex-wrap">
              {user?.github_username && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                >
                  <Github size={14} style={{ color: 'var(--accent-blue)' }} />
                  GitHub: {user.github_username}
                </span>
              )}
              {user?.bilibili_username && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                >
                  <Bilibili size={14} style={{ color: 'var(--accent-blue)' }} />
                  Bilibili: {user.bilibili_username}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-shrink-0 flex-wrap">
          <a href="/resources.html#/resources/upload" className="btn-blue">
            <Upload size={18} />
            上传资源
          </a>
          <Link to="/account/settings" className="btn-outline">
            <SettingsIcon size={18} />
            账户设置
          </Link>
        </div>
      </section>

      {/* 统计卡片 - Bento Grid */}
      <section className="bento-grid mt-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bento-card"
            style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: 8, padding: 20 }}
          >
            <div
              className="inline-flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-blue-soft)',
                color: 'var(--accent-blue)',
              }}
            >
              <stat.icon size={20} />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              {stat.label}
            </div>
            <div
              style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--foreground)', lineHeight: 1 }}
            >
              {stat.value}
              {stat.suffix && (
                <span style={{ fontSize: 14, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', marginLeft: 4 }}>
                  {stat.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* 两栏布局 */}
      <div className="grid gap-6 mt-8" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* 主内容区 */}
        <div className="flex flex-col gap-8">
          {/* 最近活动 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--foreground)', letterSpacing: 'var(--tracking-tight)' }}>
                最近活动
              </h2>
            </div>
            <div
              className="rounded-xl"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                padding: '8px 24px',
              }}
            >
              {activities.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 16px' }}>
                  <div className="title text-base font-semibold" style={{ color: 'var(--foreground)' }}>暂无活动</div>
                  <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>你最近的活动会显示在这里</div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {activities.map((act, idx) => {
                    const actText = act.title || act.text || '';
                    const actTime = act.created_at || act.time || '';
                    const actLink = getActivityLink(act.type, act.id);
                    return (
                      <div
                        key={act.id ?? idx}
                        className="flex items-start gap-3.5 py-3.5"
                        style={{ borderBottom: idx === activities.length - 1 ? 'none' : '1px solid var(--border)' }}
                      >
                        <ActivityIcon type={act.type} iconColor={act.icon} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm" style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>
                            {actLink ? (
                              <a
                                href={actLink}
                                style={{ color: 'var(--foreground)', fontWeight: 500 }}
                              >
                                {actText}
                              </a>
                            ) : (
                              actText
                            )}
                          </div>
                          <div
                            className="mt-0.5 text-xs"
                            style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
                          >
                            {formatRelativeTime(actTime)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 我的资源 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--foreground)', letterSpacing: 'var(--tracking-tight)' }}>
                我的资源
              </h2>
              <a href="/resources.html#/resources" className="text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>
                查看全部
              </a>
            </div>
            {resources.length === 0 ? (
              <div
                className="rounded-xl flex flex-col items-center justify-center text-center gap-3"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  padding: '40px 24px',
                }}
              >
                <Package size={36} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
                <div className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>还没有上传过资源</div>
                <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  分享你的第一个整合包或 Mod，与社区一起探索
                </div>
                <a href="/resources.html#/resources/upload" className="btn-blue mt-2">
                  <Upload size={16} />
                  立即上传
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {resources.map((r) => {
                  const rTitle = r.title || r.name || '';
                  const rDownloads = r.downloads_count ?? r.downloads ?? 0;
                  const rTime = r.updated_at || r.created_at || '';
                  const rHref = `/resources.html#/resources/detail?slug=${encodeURIComponent(r.slug || String(r.id))}`;
                  return (
                    <a
                      key={r.id}
                      href={rHref}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl transition-all"
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                      }}
                    >
                      <div
                        className="inline-flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 'var(--radius-sm)',
                          background: 'linear-gradient(135deg, var(--brand-200), var(--brand-400))',
                          color: 'var(--accent-blue)',
                        }}
                      >
                        <Package size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                          {rTitle}
                        </div>
                        <div className="mt-1 flex gap-3 text-xs flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
                          <span className="inline-flex items-center gap-1">
                            <Download size={14} />
                            {formatDownloads(rDownloads)} 下载
                          </span>
                          {rTime && <span>{formatRelativeTime(rTime)}更新</span>}
                          {(r.type || r.category) && (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)' }}
                            >
                              {r.type || r.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* 侧边栏 */}
        <aside className="flex flex-col gap-5">
          {/* 快捷操作 */}
          <div
            className="rounded-xl p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 className="text-[15px] font-semibold mb-3.5" style={{ color: 'var(--foreground)' }}>
              快捷操作
            </h3>
            <div className="flex flex-col gap-1">
              <QuickActionLink href="/resources.html#/resources/upload" icon={<Upload size={18} />} label="上传资源" />
              <QuickActionLink href="/resources.html#/resources" icon={<Compass size={18} />} label="浏览资源" />
              <QuickActionLink href="/forum.html#/forum" icon={<MessageCircle size={18} />} label="进入论坛" />
              <QuickActionLink href="/forum.html#/forum/new" icon={<PenLine size={18} />} label="发布内容" />
            </div>
          </div>

          {/* 账户概览 */}
          <div
            className="rounded-xl p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 className="text-[15px] font-semibold mb-3.5" style={{ color: 'var(--foreground)' }}>
              账户概览
            </h3>
            {user?.email && <OverviewRow icon={<Mail size={16} />} label="邮箱" value={user.email} />}
            {user?.github_username && <OverviewRow icon={<Github size={16} />} label="GitHub" value={user.github_username} />}
            {user?.bilibili_username && <OverviewRow icon={<Bilibili size={16} />} label="Bilibili" value={user.bilibili_username} />}
            <div className="mt-3 flex flex-col gap-1.5">
              <Link
                to="/account/settings"
                className="text-[13px] font-medium"
                style={{ color: 'var(--accent-blue)' }}
              >
                账户设置 →
              </Link>
              <Link
                to={user?.username ? `/account/profile/${user.username}` : '/account/dashboard'}
                className="text-[13px] font-medium"
                style={{ color: 'var(--accent-blue)' }}
              >
                个人主页 →
              </Link>
              {user?.is_admin && (
                <Link
                  to="/account/admin"
                  className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-warning-soft), rgba(168,85,247,0.1))',
                    color: 'var(--color-warning)',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  <Shield size={14} />
                  进入管理员控制台
                  <ArrowRight size={14} className="ml-auto" />
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActivityIcon({ type, iconColor }: { type: string; iconColor?: string }) {
  let Icon = Download;
  let color: 'green' | 'purple' | 'orange' | 'blue' | 'red' = 'blue';
  if (type === 'resource') {
    Icon = Upload;
    color = 'green';
  } else if (type === 'reply' || type === 'answer') {
    Icon = MessageCircle;
    color = 'purple';
  } else if (type === 'topic' || type === 'article' || type === 'question') {
    Icon = PenLine;
    color = 'orange';
  } else if (type === 'like') {
    Icon = Heart;
    color = 'red';
  } else if (type === 'download') {
    Icon = Download;
    color = 'blue';
  } else if (type === 'upload' || type === 'forum_post') {
    Icon = Upload;
    color = 'green';
  } else if (type === 'forum_reply') {
    Icon = MessageCircle;
    color = 'purple';
  } else if (type === 'update') {
    Icon = PenLine;
    color = 'orange';
  }

  // 允许 API 显式指定颜色
  if (iconColor && ['green', 'purple', 'orange', 'blue', 'red'].includes(iconColor)) {
    color = iconColor as typeof color;
  }

  const colorMap: Record<string, { bg: string; fg: string }> = {
    green: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    purple: { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple)' },
    orange: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
    blue: { bg: 'var(--accent-blue-soft)', fg: 'var(--accent-blue)' },
    red: { bg: 'rgba(254, 226, 226, 0.6)', fg: 'var(--destructive)' },
  };

  const c = colorMap[color];

  return (
    <div
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: c.bg, color: c.fg }}
    >
      <Icon size={18} />
    </div>
  );
}

// 根据活动类型和ID生成跨App跳转链接
function getActivityLink(type: string, id: string | number): string | null {
  const safeId = encodeURIComponent(String(id));
  switch (type) {
    case 'resource':
      // 资源详情需要在 resources App 查看
      return null; // 没有 slug，无法直接跳转，保留 null
    case 'topic':
      return `/forum.html#/forum/topic?id=${safeId}`;
    case 'article':
      return `/forum.html#/forum/article?id=${safeId}`;
    case 'question':
      return `/forum.html#/forum/question?id=${safeId}`;
    case 'reply':
    case 'answer':
      return null; // 回复/回答需要上下文，暂不支持直接跳转
    default:
      return null;
  }
}

function QuickActionLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-2.5 rounded-md transition-colors"
      style={{ color: 'var(--foreground)', fontSize: 14 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-blue-soft)',
          color: 'var(--accent-blue)',
        }}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight size={16} style={{ color: 'var(--muted-foreground)' }} />
    </a>
  );
}

function OverviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-center py-2.5 text-sm"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <span className="inline-flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
        {icon}
        {label}
      </span>
      <span
        className="font-medium"
        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
      >
        {value}
      </span>
    </div>
  );
}
