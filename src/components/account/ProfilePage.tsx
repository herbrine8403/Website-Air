import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Github,
  Mail,
  MessageSquare,
  Heart,
  Package,
  MessageCircle,
  PenLine,
  HelpCircle,
  Bookmark,
  Download,
  Loader2,
  AlertCircle,
  Calendar,
  UserCheck,
  Shield,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { MarkdownRenderer } from '@/lib/markdown';

type TabKey = 'resources' | 'topics' | 'articles' | 'questions' | 'favorites';

interface ProfileResource {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: string;
  cover_image: string | null;
  downloads_count: number;
  created_at: string;
}

interface ProfileTopic {
  id: string;
  title: string;
  category?: string;
  views_count?: number;
  replies_count?: number;
  created_at: string;
}

interface ProfileArticle {
  id: string;
  title: string;
  views_count?: number;
  comments_count?: number;
  created_at: string;
}

interface ProfileQuestion {
  id: string;
  title: string;
  status?: string;
  views_count?: number;
  answers_count?: number;
  created_at: string;
}

interface ProfileData {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    github_username: string | null;
    bilibili_username: string | null;
    is_admin?: boolean;
    created_at: string;
  };
  stats: {
    resources_count: number;
    total_downloads: number;
    forum_posts_count: number;
    total_likes: number;
    topics_count?: number;
    articles_count?: number;
    questions_count?: number;
    favorites_count?: number;
  };
  recent_resources: ProfileResource[];
  recent_topics?: ProfileTopic[];
  recent_articles?: ProfileArticle[];
  recent_questions?: ProfileQuestion[];
  favorite_resources?: ProfileResource[];
}

const TYPE_LABEL: Record<string, string> = {
  modpack: '整合包',
  mod: 'Mod',
  shader: '光影包',
  renderer: '渲染器',
  software: '软件',
  other: '其他',
};

const TYPE_THUMB_COLOR: Record<string, string> = {
  modpack: 'green',
  mod: 'orange',
  shader: 'purple',
  renderer: '',
  software: 'green',
  other: '',
};

function formatJoinDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}年${d.getMonth() + 1}月加入`;
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = Date.now();
    const diff = now - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return '刚刚';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}小时前`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}天前`;
    const mon = Math.floor(day / 30);
    if (mon < 12) return `${mon}个月前`;
    return `${Math.floor(mon / 12)}年前`;
  } catch {
    return iso;
  }
}

function formatDownloads(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}W`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('resources');
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!username) {
        setError('缺少用户名参数');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ProfileData>(`/account/profile.php?username=${encodeURIComponent(username)}`, { auth: false });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 404) setError('用户不存在或已注销');
          else setError(err.message);
        } else {
          setError('加载用户资料失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const isSelf = !!authUser && !!data && authUser.id === data.user.id;
  const isLoggedIn = !!authUser;

  const handleFollow = async () => {
    if (!isLoggedIn || !data || followPending) return;
    setFollowPending(true);
    try {
      // 关注/取消关注接口（与资源 follow 同一接口，对用户复用需要后端支持；这里保留乐观 UI）
      setFollowing((v) => !v);
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 flex items-center justify-center" style={{ color: 'var(--muted-foreground)' }}>
        <Loader2 className="animate-spin" size={20} />
        <span style={{ marginLeft: 8 }}>加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            background: 'rgba(220, 38, 38, 0.06)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            borderRadius: 'var(--radius)',
            color: 'var(--destructive)',
            fontSize: 14,
          }}
          role="alert"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { user, stats, recent_resources = [], recent_topics = [], recent_articles = [], recent_questions = [], favorite_resources = [] } = data;

  const tabs: { key: TabKey; label: string; icon: typeof Package; count: number }[] = [
    { key: 'resources', label: '资源', icon: Package, count: stats.resources_count },
    { key: 'topics', label: '帖子', icon: MessageCircle, count: stats.topics_count ?? 0 },
    { key: 'articles', label: '文章', icon: PenLine, count: stats.articles_count ?? 0 },
    { key: 'questions', label: '问答', icon: HelpCircle, count: stats.questions_count ?? 0 },
    { key: 'favorites', label: '收藏', icon: Bookmark, count: stats.favorites_count ?? favorite_resources.length },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-6" style={{ paddingTop: 24, paddingBottom: 80 }}>
      {/* 封面区 */}
      <div
        className="profile-cover"
        style={{
          position: 'relative',
          height: 200,
          borderRadius: 'var(--radius)',
          background: 'linear-gradient(135deg, var(--brand-100) 0%, var(--brand-300) 50%, var(--brand-400) 100%)',
          overflow: 'hidden',
          marginTop: 24,
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 30%, rgba(68, 118, 213, 0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(91, 141, 239, 0.18), transparent 45%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.4,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* 主页头部信息 */}
      <div className="profile-header" style={{ position: 'relative', padding: '0 24px', marginTop: -56 }}>
        <div
          className="avatar avatar-xl"
          style={{
            position: 'relative',
            zIndex: 2,
            width: 112,
            height: 112,
            borderRadius: '50%',
            border: '5px solid var(--background)',
            boxShadow: 'var(--shadow-md)',
            // 已注销账号使用灰色头像
            background: /^已注销账号-\d+$/.test(user.username || '')
              ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
              : 'var(--accent-blue)',
            color: /^已注销账号-\d+$/.test(user.username || '')
              ? '#f3f4f6'
              : 'var(--accent-blue-foreground)',
            filter: /^已注销账号-\d+$/.test(user.username || '') ? 'grayscale(1)' : undefined,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 32,
            overflow: 'hidden',
          }}
        >
          {user.avatar_url && !/^已注销账号-\d+$/.test(user.username || '') ? (
            <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            getInitials(user.username)
          )}
        </div>

        <div
          className="profile-info-row"
          style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginTop: 16, flexWrap: 'wrap' }}
        >
          <div className="profile-info" style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 32,
                  color: 'var(--foreground)',
                  letterSpacing: 'var(--tracking-tight)',
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {user.username}
              </h1>
              <span
                className={user.is_admin ? 'badge badge-orange' : 'badge badge-blue'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: user.is_admin
                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                    : 'var(--accent-blue)',
                  color: '#fff',
                }}
              >
                {user.is_admin ? <Shield size={12} strokeWidth={2.5} /> : <UserCheck size={12} strokeWidth={2.5} />}
                {user.is_admin ? '管理员' : '用户'}
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 15,
                color: 'var(--muted-foreground)',
                maxWidth: 560,
                lineHeight: 1.6,
              }}
            >
              {user.bio ? <MarkdownRenderer content={user.bio} /> : <span style={{ color: 'var(--muted-foreground)' }}>这位用户很神秘，什么都没留下。</span>}
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              {user.github_username && (
                <a
                  href={`https://github.com/${encodeURIComponent(user.github_username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  title="GitHub"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted-foreground)',
                    transition: 'color 0.16s ease, border-color 0.16s ease',
                  }}
                >
                  <Github size={18} />
                </a>
              )}
              {user.bilibili_username && (
                <a
                  href={`https://space.bilibili.com/search?keyword=${encodeURIComponent(user.bilibili_username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  title="Bilibili"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted-foreground)',
                    transition: 'color 0.16s ease, border-color 0.16s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.987c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM8 11.107c.373 0 .684.124.933.373.25.249.373.56.373.933v1.174c0 .373-.124.684-.373.933-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.249-.249-.373-.56-.373-.933v-1.174c0-.373.124-.684.373-.933.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.249.249.373.56.373.933v1.174c0 .373-.124.684-.373.933-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.249-.249-.373-.56-.373-.933v-1.174c0-.373.124-.684.373-.933.249-.249.56-.373.933-.373z"/>
                  </svg>
                </a>
              )}
              <a
                href={`mailto:example@example.com`}
                className="social-link"
                title="邮箱"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted-foreground)',
                  transition: 'color 0.16s ease, border-color 0.16s ease',
                  pointerEvents: 'none',
                  opacity: 0.5,
                }}
                onClick={(e) => e.preventDefault()}
              >
                <Mail size={18} />
              </a>
            </div>

            <div
              className="profile-stats"
              style={{ display: 'flex', gap: 24, marginTop: 14, fontSize: 13, color: 'var(--muted-foreground)', flexWrap: 'wrap' }}
            >
              <span className="stat-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} />
                {formatJoinDate(user.created_at)}
              </span>
              <span className="stat-item">
                <strong style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 15, marginRight: 4 }}>{stats.total_downloads}</strong>
                下载量
              </span>
              <span className="stat-item">
                <strong style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 15, marginRight: 4 }}>{stats.forum_posts_count}</strong>
                帖子
              </span>
              <span className="stat-item">
                <strong style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 15, marginRight: 4 }}>{stats.total_likes}</strong>
                获赞
              </span>
            </div>
          </div>

          {/* 操作按钮：登录后且非本人可见 */}
          {isLoggedIn && !isSelf && (
            <div className="profile-actions" style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <button
                type="button"
                className="btn-blue"
                onClick={handleFollow}
                disabled={followPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 'var(--radius)',
                  background: following ? 'var(--muted)' : 'var(--btn-bg)',
                  color: following ? 'var(--foreground)' : 'var(--btn-blue-fg)',
                  border: following ? '1px solid var(--border)' : 'none',
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: followPending ? 'not-allowed' : 'pointer',
                  opacity: followPending ? 0.6 : 1,
                }}
              >
                <Heart size={16} fill={following ? 'currentColor' : 'none'} />
                {following ? '已关注' : '关注'}
              </button>
              <Link
                to="/account/notifications"
                className="btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                <MessageSquare size={16} />
                发消息
              </Link>
            </div>
          )}
          {isSelf && (
            <div className="profile-actions" style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <Link
                to="/account/settings"
                className="btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                编辑资料
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      <div
        className="profile-tabs"
        style={{
          marginTop: 28,
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--accent-blue)' : 'var(--muted-foreground)',
                borderBottom: `2px solid ${isActive ? 'var(--accent-blue)' : 'transparent'}`,
                marginBottom: -1,
                whiteSpace: 'nowrap',
                transition: 'color 0.16s ease, border-color 0.16s ease',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <tab.icon size={16} />
              {tab.label}
              <span style={{ fontSize: 12, color: isActive ? 'var(--accent-blue)' : 'var(--muted-foreground)', marginLeft: 4 }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 内容区 */}
      <div style={{ marginTop: 24 }}>
        {activeTab === 'resources' && (
          <ResourceGrid resources={recent_resources} />
        )}
        {activeTab === 'topics' && (
          <ForumList
            items={recent_topics}
            emptyText="该用户还没有发布过帖子"
            type="topic"
          />
        )}
        {activeTab === 'articles' && (
          <ForumList
            items={recent_articles}
            emptyText="该用户还没有发布过文章"
            type="article"
          />
        )}
        {activeTab === 'questions' && (
          <ForumList
            items={recent_questions}
            emptyText="该用户还没有发布过问答"
            type="question"
          />
        )}
        {activeTab === 'favorites' && (
          <ResourceGrid resources={favorite_resources} emptyIcon="bookmark" emptyTitle="暂无收藏" emptyDesc="该用户还没有收藏过内容" />
        )}
      </div>

      {/* 内联样式：社交链接 hover */}
      <style>{`
        .social-link:hover { color: var(--accent-blue) !important; border-color: var(--accent-blue) !important; }
      `}</style>
    </div>
  );
}

function ResourceGrid({ resources, emptyIcon, emptyTitle, emptyDesc }: { resources: ProfileResource[]; emptyIcon?: 'package' | 'bookmark'; emptyTitle?: string; emptyDesc?: string }) {
  if (!resources || resources.length === 0) {
    const icon = emptyIcon === 'bookmark' ? <Bookmark size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} /> : <Package size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />;
    return (
      <div
        className="empty-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: 12,
        }}
      >
        {icon}
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{emptyTitle || '暂无资源'}</div>
        <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{emptyDesc || '该用户还没有发布过资源'}</div>
      </div>
    );
  }
  return (
    <div
      className="resource-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
      }}
    >
      {resources.map((r) => {
        const color = TYPE_THUMB_COLOR[r.type] || '';
        const href = `/resources.html#/resources/detail?slug=${encodeURIComponent(r.slug)}`;
        return (
          <a
            key={r.id}
            href={href}
            className="resource-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'box-shadow 0.16s ease, border-color 0.16s ease, transform 0.15s ease',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                className={`thumb ${color}`}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, var(--brand-200), var(--brand-400))',
                  color: 'var(--accent-blue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Package size={28} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.3 }}>{r.title}</div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {r.summary || '暂无简介'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                className="tag tag-active"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-blue)',
                  color: 'var(--accent-blue-foreground)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {TYPE_LABEL[r.type] || r.type}
              </span>
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                color: 'var(--muted-foreground)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, color: 'var(--foreground)' }}>
                <Download size={14} />
                {formatDownloads(r.downloads_count)} 下载
              </span>
              <span>{formatRelative(r.created_at)}更新</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

interface ForumListProps {
  items: Array<{ id: string; title: string; category?: string; views_count?: number; replies_count?: number; comments_count?: number; answers_count?: number; status?: string; created_at: string }>;
  emptyText: string;
  type: 'topic' | 'article' | 'question';
}

function ForumList({ items, emptyText, type }: ForumListProps) {
  if (!items || items.length === 0) {
    return (
      <div
        className="empty-state"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: 12,
        }}
      >
        <Package size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>暂无内容</div>
        <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>{emptyText}</div>
      </div>
    );
  }
  const icon = type === 'topic' ? <MessageCircle size={18} /> : type === 'article' ? <PenLine size={18} /> : <HelpCircle size={18} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it) => {
        const href = `/forum.html#/forum/${type}?id=${encodeURIComponent(it.id)}`;
        const secondary = type === 'topic'
          ? `${it.replies_count ?? 0} 回复 · ${it.views_count ?? 0} 浏览`
          : type === 'article'
          ? `${it.comments_count ?? 0} 评论 · ${it.views_count ?? 0} 浏览`
          : `${it.answers_count ?? 0} 回答 · ${it.views_count ?? 0} 浏览`;
        const badge = type === 'topic' && it.category
          ? it.category
          : type === 'question' && it.status
          ? (it.status === 'open' ? '待解答' : it.status === 'resolved' ? '已解决' : it.status === 'closed' ? '已关闭' : it.status)
          : null;
        return (
          <a
            key={it.id}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'box-shadow 0.16s ease, border-color 0.16s ease',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-blue-soft)',
                color: 'var(--accent-blue)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.title}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted-foreground)' }}>
                {secondary} · {formatRelative(it.created_at)}
              </div>
            </div>
            {badge && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {badge}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
