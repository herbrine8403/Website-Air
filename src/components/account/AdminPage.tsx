import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  Package,
  MessageSquare,
  Megaphone,
  History,
  Loader2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Ban,
  CheckCircle2,
  XCircle,
  UserCheck,
  ExternalLink,
  Calendar,
  TrendingUp,
  Download,
  Eye,
  Filter,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type TabKey = 'overview' | 'users' | 'resources' | 'forum' | 'announcements' | 'audit';

interface StatsResponse {
  success: boolean;
  stats: {
    users: { total: number; active: number; admins: number; new_today: number };
    resources: { total: number; published: number; pending: number; draft: number; removed: number; total_downloads: number };
    forum: { topics: number; articles: number; questions: number; answers: number; replies: number; solved: number };
    system: { announcements: number; audit_logs_24h: number };
  };
  user_trend_7d: { date: string; count: number }[];
  recent_audit_logs: AuditLog[];
}

interface UserItem {
  id: string;
  username: string;
  email: string;
  github_id: string | null;
  github_username: string | null;
  bilibili_username: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  role: string;
  is_admin: boolean;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

interface ResourceItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  type: string;
  user_id: string;
  author_name: string | null;
  cover_image: string | null;
  downloads_count: number;
  followers_count: number;
  rating_avg: number;
  rating_count: number;
  status: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  id: string;
  admin_id: string;
  admin_username: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  date: string;
  summary: string;
  priority: string;
  action_url: string;
  action_title: string;
  image_url: string;
}

const TABS: { key: TabKey; label: string; icon: typeof Shield }[] = [
  { key: 'overview', label: '概览', icon: LayoutDashboard },
  { key: 'users', label: '用户', icon: Users },
  { key: 'resources', label: '资源', icon: Package },
  { key: 'forum', label: '论坛', icon: MessageSquare },
  { key: 'announcements', label: '公告', icon: Megaphone },
  { key: 'audit', label: '审计日志', icon: History },
];

function formatNumber(n: number): string {
  if (n === undefined || n === null) return '0';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('zh-CN');
}

function formatRelativeTime(time: string | null): string {
  if (!time) return '从未';
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
    if (day < 30) return `${day} 天前`;
    return dt.toLocaleDateString('zh-CN');
  } catch {
    return time;
  }
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    // 立即检查前端 is_admin 标志
    if (user && !user.is_admin) {
      setForbidden(true);
      setTimeout(() => navigate('/account/dashboard'), 1500);
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={20} />
        加载中...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: 'var(--destructive)',
          }}
        >
          <AlertCircle size={20} />
          <span className="text-sm">无管理员权限，正在跳转...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-20">
      {/* 顶部头部 */}
      <section
        className="flex items-center justify-between gap-4 flex-wrap p-5 rounded-xl mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.10) 100%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/account/dashboard"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors"
            style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            aria-label="返回控制台"
          >
            <ArrowLeft size={18} />
          </Link>
          <div
            className="inline-flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-purple, #a855f7), var(--accent-blue))',
              color: '#fff',
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                lineHeight: 1.1,
                color: 'var(--foreground)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              管理员控制台
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              欢迎回来，{user.username}。在此管理社区、内容和系统。
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge label="管理员" color="purple" />
          <StatusBadge label={user.email === 'weishixvn@outlook.com' ? '主管理员' : '协作管理员'} color="blue" />
        </div>
      </section>

      {/* 标签栏 */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap"
              style={{
                background: isActive ? 'var(--accent-blue)' : 'transparent',
                color: isActive ? 'var(--accent-blue-foreground)' : 'var(--muted-foreground)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'resources' && <ResourcesTab />}
        {activeTab === 'forum' && <ForumTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'gray' }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    purple: { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple)' },
    blue: { bg: 'var(--accent-blue-soft)', fg: 'var(--accent-blue)' },
    green: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    orange: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
    red: { bg: 'rgba(254, 226, 226, 0.6)', fg: 'var(--destructive)' },
    gray: { bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  };
  const c = colorMap[color] || colorMap.gray;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {label}
    </span>
  );
}

// ============================================================
// 概览 Tab
// ============================================================

function OverviewTab() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<StatsResponse>('/admin/stats.php');
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError('无管理员权限');
        } else {
          setError(err.message);
        }
      } else {
        setError('加载失败');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return null;

  const { stats } = data;

  const cards = [
    { label: '用户总数', value: stats.users.total, sub: `+${stats.users.new_today} 今日`, icon: Users, color: 'blue' as const },
    { label: '资源总数', value: stats.resources.total, sub: `${stats.resources.published} 已发布`, icon: Package, color: 'green' as const },
    { label: '论坛内容', value: stats.forum.topics + stats.forum.articles + stats.forum.questions, sub: `${stats.forum.replies} 回复`, icon: MessageSquare, color: 'purple' as const },
    { label: '总下载量', value: stats.resources.total_downloads, sub: '累计下载', icon: Download, color: 'orange' as const },
    { label: '管理员', value: stats.users.admins, sub: '位管理员', icon: Shield, color: 'red' as const },
    { label: '24h 操作', value: stats.system.audit_logs_24h, sub: '审计日志', icon: History, color: 'blue' as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部统计 Bento Grid */}
      <section className="bento-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {cards.map((card) => {
          const Icon = card.icon;
          const colorMap: Record<string, { bg: string; fg: string }> = {
            blue: { bg: 'var(--accent-blue-soft)', fg: 'var(--accent-blue)' },
            green: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
            purple: { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple)' },
            orange: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
            red: { bg: 'rgba(254, 226, 226, 0.6)', fg: 'var(--destructive)' },
          };
          const c = colorMap[card.color];
          return (
            <div
              key={card.label}
              className="bento-card"
              style={{ gridColumn: 'span 1', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div
                className="inline-flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: c.bg, color: c.fg }}
              >
                <Icon size={18} />
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                {card.label}
              </div>
              <div
                style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--foreground)', lineHeight: 1 }}
              >
                {formatNumber(card.value)}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                {card.sub}
              </div>
            </div>
          );
        })}
      </section>

      {/* 两栏：趋势 + 详情 */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* 7 天用户趋势 */}
        <SectionCard title="最近 7 天新用户" icon={<TrendingUp size={18} />}>
          {data.user_trend_7d.length === 0 ? (
            <EmptyHint text="最近 7 天无新用户注册" />
          ) : (
            <div className="flex items-end gap-2" style={{ height: 180, padding: '8px 4px' }}>
              {data.user_trend_7d.map((item) => {
                const max = Math.max(...data.user_trend_7d.map((d) => d.count), 1);
                const h = Math.max(8, (item.count / max) * 140);
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div
                      className="text-[11px] font-mono"
                      style={{ color: 'var(--accent-blue)' }}
                    >
                      {item.count}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 36,
                        height: h,
                        background: 'linear-gradient(180deg, var(--accent-blue), var(--accent-blue-soft))',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      }}
                    />
                    <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {item.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* 资源分布 */}
        <SectionCard title="资源状态分布" icon={<Package size={18} />}>
          <div className="flex flex-col gap-3">
            <DistBar label="已发布" value={stats.resources.published} total={stats.resources.total} color="var(--color-success)" />
            <DistBar label="待审核" value={stats.resources.pending} total={stats.resources.total} color="var(--color-warning)" />
            <DistBar label="草稿" value={stats.resources.draft} total={stats.resources.total} color="var(--muted-foreground)" />
            <DistBar label="已下架" value={stats.resources.removed} total={stats.resources.total} color="var(--destructive)" />
          </div>
        </SectionCard>
      </div>

      {/* 论坛统计 + 最近审计 */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <SectionCard title="论坛内容" icon={<MessageSquare size={18} />}>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="话题" value={stats.forum.topics} />
            <StatTile label="文章" value={stats.forum.articles} />
            <StatTile label="问题" value={stats.forum.questions} />
            <StatTile label="已解决" value={stats.forum.solved} />
            <StatTile label="回答" value={stats.forum.answers} />
            <StatTile label="回复" value={stats.forum.replies} />
          </div>
        </SectionCard>

        <SectionCard title="最近管理员操作" icon={<History size={18} />}>
          {data.recent_audit_logs.length === 0 ? (
            <EmptyHint text="暂无审计日志" />
          ) : (
            <div className="flex flex-col">
              {data.recent_audit_logs.map((log, idx) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-2.5"
                  style={{ borderBottom: idx === data.recent_audit_logs.length - 1 ? 'none' : '1px solid var(--border)' }}
                >
                  <div
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-purple-soft)',
                      color: 'var(--color-purple)',
                    }}
                  >
                    <Shield size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                      <span className="font-semibold">{log.admin_username || `#${log.admin_id}`}</span>
                      <span style={{ color: 'var(--muted-foreground)' }}> · </span>
                      <span style={{ color: 'var(--accent-blue)' }}>{log.action}</span>
                      {log.target_type && (
                        <span style={{ color: 'var(--muted-foreground)' }}> → {log.target_type}#{log.target_id}</span>
                      )}
                    </div>
                    {log.detail && (
                      <div className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {log.detail}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
                      {formatRelativeTime(log.created_at)} · {log.ip || 'unknown'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function DistBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center text-xs mb-1">
        <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
        <span className="font-mono" style={{ color: 'var(--foreground)' }}>
          {value} <span style={{ color: 'var(--muted-foreground)' }}>({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--muted)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
    >
      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </div>
      <div className="mt-1" style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--foreground)' }}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

// ============================================================
// 用户管理 Tab
// ============================================================

function UsersTab() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const size = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (q) params.set('q', q);
      if (statusFilter) params.set('status', statusFilter);
      if (adminFilter) params.set('is_admin', adminFilter);
      const res = await api.get<{ success: boolean; users: UserItem[]; total: number }>(`/admin/users.php?${params.toString()}`);
      setItems(res.users);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, q, statusFilter, adminFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (userId: string, action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(userId + action);
    try {
      await api.post('/admin/users.php', { user_id: parseInt(userId), action, ...extra });
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div className="flex flex-col gap-4">
      {/* 工具栏 */}
      <ToolbarCard>
        <SearchInput value={q} onChange={setQ} placeholder="搜索用户名/邮箱/GitHub" onSearch={load} />
        <FilterSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: '', label: '所有状态' },
            { value: 'active', label: '正常' },
            { value: 'suspended', label: '暂停' },
            { value: 'banned', label: '封禁' },
          ]}
        />
        <FilterSelect
          value={adminFilter}
          onChange={(v) => { setAdminFilter(v); setPage(1); }}
          options={[
            { value: '', label: '所有用户' },
            { value: '1', label: '仅管理员' },
            { value: '0', label: '非管理员' },
          ]}
        />
        <button onClick={load} className="btn-outline-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
        <div className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>
          共 {total} 位用户
        </div>
      </ToolbarCard>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Users size={36} />} title="没有用户" hint="尝试调整筛选条件" />
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  <Th>用户</Th>
                  <Th>邮箱</Th>
                  <Th>状态</Th>
                  <Th>角色</Th>
                  <Th>注册时间</Th>
                  <Th>最后登录</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar url={u.avatar_url} name={u.username} size={32} />
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                            {u.username}
                          </div>
                          {u.github_username && (
                            <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                              @{u.github_username}
                            </div>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {u.email}
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge
                        label={u.status === 'active' ? '正常' : u.status === 'banned' ? '封禁' : u.status === 'suspended' ? '暂停' : u.status}
                        color={u.status === 'active' ? 'green' : u.status === 'banned' ? 'red' : 'orange'}
                      />
                    </Td>
                    <Td>
                      {u.is_admin ? <StatusBadge label="管理员" color="purple" /> : <StatusBadge label="普通" color="gray" />}
                    </Td>
                    <Td>
                      <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {u.created_at?.slice(0, 10)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {formatRelativeTime(u.last_login_at)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <IconButton
                          title={u.is_admin ? '撤销管理员' : '设为管理员'}
                          loading={actionLoading === u.id + 'set_admin'}
                          onClick={() => doAction(u.id, 'set_admin', { is_admin: !u.is_admin })}
                        >
                          <UserCheck size={14} style={{ color: u.is_admin ? 'var(--color-purple)' : 'var(--muted-foreground)' }} />
                        </IconButton>
                        <IconButton
                          title={u.status === 'active' ? '暂停用户' : '恢复用户'}
                          loading={actionLoading === u.id + 'set_status'}
                          onClick={() => doAction(u.id, 'set_status', { status: u.status === 'active' ? 'suspended' : 'active' })}
                        >
                          {u.status === 'active' ? <Ban size={14} style={{ color: 'var(--color-warning)' }} /> : <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />}
                        </IconButton>
                        <IconButton
                          title="封禁用户"
                          loading={actionLoading === u.id + 'ban'}
                          onClick={() => {
                            if (confirm(`确认封禁用户 ${u.username}？`)) doAction(u.id, 'set_status', { status: 'banned' });
                          }}
                        >
                          <XCircle size={14} style={{ color: 'var(--destructive)' }} />
                        </IconButton>
                        <IconButton
                          title="删除用户"
                          loading={actionLoading === u.id + 'delete_user'}
                          onClick={() => {
                            if (confirm(`确认删除用户 ${u.username}？此操作不可恢复！`)) doAction(u.id, 'delete_user');
                          }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--destructive)' }} />
                        </IconButton>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

// ============================================================
// 资源管理 Tab
// ============================================================

function ResourcesTab() {
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const size = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (q) params.set('q', q);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ success: boolean; resources: ResourceItem[]; total: number }>(`/admin/resources.php?${params.toString()}`);
      setItems(res.resources);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, q, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(id + action);
    try {
      await api.post('/admin/resources.php', { resource_id: parseInt(id), action, ...extra });
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div className="flex flex-col gap-4">
      <ToolbarCard>
        <SearchInput value={q} onChange={setQ} placeholder="搜索资源标题/slug" onSearch={load} />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: '', label: '所有类型' },
            { value: 'mod', label: 'Mod' },
            { value: 'modpack', label: '整合包' },
            { value: 'shader', label: '光影' },
            { value: 'resourcepack', label: '材质包' },
            { value: 'world', label: '世界' },
            { value: 'launcher', label: '启动器' },
          ]}
        />
        <FilterSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: '', label: '所有状态' },
            { value: 'published', label: '已发布' },
            { value: 'pending', label: '待审核' },
            { value: 'draft', label: '草稿' },
            { value: 'removed', label: '已下架' },
          ]}
        />
        <button onClick={load} className="btn-outline-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
        <div className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>
          共 {total} 个资源
        </div>
      </ToolbarCard>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Package size={36} />} title="没有资源" hint="尝试调整筛选条件" />
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  <Th>资源</Th>
                  <Th>作者</Th>
                  <Th>类型</Th>
                  <Th>状态</Th>
                  <Th>下载</Th>
                  <Th>更新时间</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      <Link to={`/resources/${r.slug}`} className="flex items-center gap-2 hover:underline">
                        <div
                          className="inline-flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                            background: r.cover_image ? `center/cover url(${r.cover_image})` : 'linear-gradient(135deg, var(--brand-200), var(--brand-400))',
                            color: 'var(--accent-blue)',
                          }}
                        >
                          {!r.cover_image && <Package size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)', maxWidth: 240 }}>
                            {r.title}
                          </div>
                          <div className="text-[11px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
                            {r.slug}
                          </div>
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {r.author_name || `#${r.user_id}`}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge label={r.type} color="blue" />
                    </Td>
                    <Td>
                      <StatusBadge
                        label={r.status === 'published' ? '已发布' : r.status === 'pending' ? '待审核' : r.status === 'draft' ? '草稿' : r.status === 'removed' ? '已下架' : r.status}
                        color={r.status === 'published' ? 'green' : r.status === 'pending' ? 'orange' : r.status === 'removed' ? 'red' : 'gray'}
                      />
                      {r.featured && <span className="ml-1"><StatusBadge label="精选" color="purple" /></span>}
                    </Td>
                    <Td>
                      <span className="text-xs font-mono" style={{ color: 'var(--foreground)' }}>
                        {formatNumber(r.downloads_count)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {formatRelativeTime(r.updated_at)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <IconButton
                          title={r.featured ? '取消精选' : '设为精选'}
                          loading={actionLoading === r.id + 'set_featured'}
                          onClick={() => doAction(r.id, 'set_featured', { featured: !r.featured })}
                        >
                          <Star size={14} style={{ color: r.featured ? 'var(--color-warning)' : 'var(--muted-foreground)', fill: r.featured ? 'currentColor' : 'none' }} />
                        </IconButton>
                        <IconButton
                          title={r.status === 'published' ? '下架' : '上架'}
                          loading={actionLoading === r.id + 'set_status'}
                          onClick={() => doAction(r.id, 'set_status', { status: r.status === 'published' ? 'removed' : 'published' })}
                        >
                          {r.status === 'published' ? <Ban size={14} style={{ color: 'var(--color-warning)' }} /> : <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />}
                        </IconButton>
                        <IconButton
                          title="删除资源"
                          loading={actionLoading === r.id + 'delete_resource'}
                          onClick={() => {
                            if (confirm(`确认删除资源 ${r.title}？此操作不可恢复！`)) doAction(r.id, 'delete_resource');
                          }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--destructive)' }} />
                        </IconButton>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

// ============================================================
// 论坛管理 Tab
// ============================================================

function ForumTab() {
  const [type, setType] = useState<'topic' | 'article' | 'question' | 'reply' | 'answer'>('topic');
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const size = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, page: String(page), size: String(size) });
      if (q) params.set('q', q);
      const res = await api.get<{ success: boolean; items: Record<string, unknown>[]; total: number }>(`/admin/forum.php?${params.toString()}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [type, page, q]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(id + action);
    try {
      await api.post('/admin/forum.php', { id: parseInt(id), type, action, ...extra });
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / size);

  const typeLabels: Record<string, string> = {
    topic: '话题',
    article: '文章',
    question: '问题',
    reply: '回复',
    answer: '回答',
  };

  return (
    <div className="flex flex-col gap-4">
      <ToolbarCard>
        <FilterSelect
          value={type}
          onChange={(v) => { setType(v as typeof type); setPage(1); }}
          options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
        <SearchInput value={q} onChange={setQ} placeholder="搜索内容" onSearch={load} />
        <button onClick={load} className="btn-outline-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
        <div className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>
          共 {total} 条{typeLabels[type]}
        </div>
      </ToolbarCard>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<MessageSquare size={36} />} title={`没有${typeLabels[type]}`} hint="尝试调整筛选条件" />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const id = String(item.id);
            const title = (item.title || item.content || '') as string;
            const username = (item.author_name || `#${item.user_id}`) as string;
            const status = item.status as string | undefined;
            const featured = item.featured as boolean | undefined;
            const created_at = item.created_at as string;
            const replies_count = item.replies_count as number | undefined;
            const views_count = item.views_count as number | undefined;
            const targetLink =
              type === 'topic' ? `/forum/topic/${id}` :
              type === 'article' ? `/forum/article/${id}` :
              type === 'question' ? `/forum/question/${id}` : null;
            return (
              <div
                key={id}
                className="flex items-center gap-3 p-3 rounded-md"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {targetLink ? (
                      <Link to={targetLink} className="text-sm font-semibold hover:underline" style={{ color: 'var(--foreground)' }}>
                        {title.length > 60 ? title.slice(0, 60) + '...' : title}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {title.length > 80 ? title.slice(0, 80) + '...' : title}
                      </span>
                    )}
                    {status && (
                      <StatusBadge
                        label={status === 'published' ? '已发布' : status === 'pending' ? '待审核' : status === 'removed' ? '已下架' : status === 'hidden' ? '隐藏' : status}
                        color={status === 'published' ? 'green' : status === 'pending' ? 'orange' : 'gray'}
                      />
                    )}
                    {featured && <StatusBadge label="精选" color="purple" />}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                    <span>作者: {username}</span>
                    {views_count !== undefined && <span>浏览: {formatNumber(views_count)}</span>}
                    {replies_count !== undefined && <span>回复: {formatNumber(replies_count)}</span>}
                    <span>{formatRelativeTime(created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(type === 'topic' || type === 'article' || type === 'question') && (
                    <IconButton
                      title={featured ? '取消精选' : '设为精选'}
                      loading={actionLoading === id + 'set_featured'}
                      onClick={() => doAction(id, 'set_featured', { featured: !featured })}
                    >
                      <Star size={14} style={{ color: featured ? 'var(--color-warning)' : 'var(--muted-foreground)', fill: featured ? 'currentColor' : 'none' }} />
                    </IconButton>
                  )}
                  {targetLink && (
                    <Link to={targetLink} className="icon-btn" aria-label="查看">
                      <Eye size={14} />
                    </Link>
                  )}
                  <IconButton
                    title="删除"
                    loading={actionLoading === id + 'delete_post'}
                    onClick={() => {
                      if (confirm('确认删除此内容？此操作不可恢复！')) doAction(id, 'delete_post');
                    }}
                  >
                    <Trash2 size={14} style={{ color: 'var(--destructive)' }} />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

// ============================================================
// 公告管理 Tab
// ============================================================

function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; announcements: Announcement[]; last_updated: string | null; source: string; note: string }>('/admin/announcements.php');
      setItems(res.announcements);
      setLastUpdated(res.last_updated);
      setSource(res.source);
      setNote(res.note || '');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCache = async () => {
    try {
      await api.post('/admin/announcements.php', { action: 'refresh_cache' });
      await load();
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('刷新失败');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ToolbarCard>
        <button onClick={load} className="btn-outline-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          重新加载
        </button>
        <button onClick={refreshCache} className="btn-outline-sm">
          <Trash2 size={14} />
          刷新缓存
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {source && <StatusBadge label={source === 'cache' ? '缓存' : '实时'} color={source === 'cache' ? 'gray' : 'green'} />}
          {lastUpdated && <span>更新于 {formatRelativeTime(lastUpdated)}</span>}
        </div>
      </ToolbarCard>

      {note && (
        <div
          className="flex items-start gap-2 p-3 rounded-md text-xs"
          style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid rgba(168,85,247,0.2)' }}
        >
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Megaphone size={36} />} title="暂无公告" hint="在 announcements.php 中添加公告" />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 p-4 rounded-md"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: a.priority === 'high' ? 'rgba(254, 226, 226, 0.6)' : 'var(--accent-blue-soft)',
                  color: a.priority === 'high' ? 'var(--destructive)' : 'var(--accent-blue)',
                }}
              >
                <Megaphone size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {a.title}
                  </span>
                  <StatusBadge label={a.priority === 'high' ? '高优先级' : '普通'} color={a.priority === 'high' ? 'red' : 'gray'} />
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {a.summary}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={11} />
                    {a.date}
                  </span>
                  <span className="font-mono">ID: {a.id}</span>
                  {a.action_url && (
                    <a
                      href={a.action_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1"
                      style={{ color: 'var(--accent-blue)' }}
                    >
                      {a.action_title || '操作链接'}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 审计日志 Tab
// ============================================================

function AuditTab() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [actionStats, setActionStats] = useState<{ action: string; count: number }[]>([]);
  const size = 30;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      if (q) params.set('q', q);
      if (actionFilter) params.set('action', actionFilter);
      if (targetTypeFilter) params.set('target_type', targetTypeFilter);
      const res = await api.get<{ success: boolean; logs: AuditLog[]; total: number; action_stats_30d: { action: string; count: number }[] }>(`/admin/audit-log.php?${params.toString()}`);
      setItems(res.logs);
      setTotal(res.total);
      setActionStats(res.action_stats_30d || []);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, q, actionFilter, targetTypeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / size);

  return (
    <div className="flex flex-col gap-4">
      <ToolbarCard>
        <SearchInput value={q} onChange={setQ} placeholder="搜索详情/管理员" onSearch={load} />
        <FilterSelect
          value={actionFilter}
          onChange={(v) => { setActionFilter(v); setPage(1); }}
          options={[
            { value: '', label: '所有操作' },
            { value: 'set_status', label: '状态变更' },
            { value: 'set_admin', label: '管理员变更' },
            { value: 'delete_user', label: '删除用户' },
            { value: 'set_featured', label: '精选变更' },
            { value: 'delete_resource', label: '删除资源' },
            { value: 'delete_post', label: '删除帖子' },
            { value: 'refresh_announcement_cache', label: '刷新缓存' },
          ]}
        />
        <FilterSelect
          value={targetTypeFilter}
          onChange={(v) => { setTargetTypeFilter(v); setPage(1); }}
          options={[
            { value: '', label: '所有目标' },
            { value: 'user', label: '用户' },
            { value: 'resource', label: '资源' },
            { value: 'topic', label: '话题' },
            { value: 'article', label: '文章' },
            { value: 'question', label: '问题' },
            { value: 'reply', label: '回复' },
            { value: 'answer', label: '回答' },
            { value: 'announcement', label: '公告' },
          ]}
        />
        <button onClick={load} className="btn-outline-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
        <div className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>
          共 {total} 条
        </div>
      </ToolbarCard>

      {/* 30 天操作统计 */}
      {actionStats.length > 0 && (
        <SectionCard title="30 天操作统计" icon={<Filter size={16} />}>
          <div className="flex flex-wrap gap-2">
            {actionStats.map((s) => (
              <div
                key={s.action}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs"
                style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              >
                <span style={{ color: 'var(--muted-foreground)' }}>{s.action}</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--accent-blue)' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<History size={36} />} title="暂无日志" hint="管理员操作会自动记录到这里" />
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--muted)' }}>
                  <Th>管理员</Th>
                  <Th>操作</Th>
                  <Th>目标</Th>
                  <Th>详情</Th>
                  <Th>IP</Th>
                  <Th>时间</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {log.admin_username || `#${log.admin_id}`}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono" style={{ color: 'var(--accent-blue)' }}>
                        {log.action}
                      </span>
                    </Td>
                    <Td>
                      {log.target_type ? (
                        <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                          {log.target_type}
                          {log.target_id ? `#${log.target_id}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>-</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)', maxWidth: 320, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.detail || '-'}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {log.ip || '-'}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

// ============================================================
// 共享 UI 组件
// ============================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="animate-spin mr-2" size={20} />
      加载中...
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
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
      <span className="text-sm flex-1">{message}</span>
      <button onClick={onRetry} className="btn-outline-sm">
        重试
      </button>
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center text-center gap-3 py-16"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{icon}</div>
      <div className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{title}</div>
      {hint && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{hint}</div>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>
      {text}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span style={{ color: 'var(--accent-blue)' }}>{icon}</span>
        )}
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ToolbarCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap p-3 rounded-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {children}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, onSearch }: { value: string; onChange: (v: string) => void; placeholder: string; onSearch: () => void }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm rounded-md"
      style={{
        background: 'var(--background)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide"
      style={{ color: 'var(--muted-foreground)' }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5 align-middle">{children}</td>;
}

function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      />
    );
  }
  return (
    <div
      className="inline-flex items-center justify-center font-bold"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)',
        fontSize: size * 0.4,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function IconButton({ title, onClick, loading, children }: { title: string; onClick: () => void; loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors"
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
        opacity: loading ? 0.5 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : children}
    </button>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      <button
        onClick={() => onChange(1)}
        disabled={page === 1}
        className="px-2 py-1 text-xs rounded-md"
        style={{ border: '1px solid var(--border)', color: 'var(--foreground)', opacity: page === 1 ? 0.5 : 1 }}
      >
        首页
      </button>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-2 py-1 text-xs rounded-md"
        style={{ border: '1px solid var(--border)', color: 'var(--foreground)', opacity: page === 1 ? 0.5 : 1 }}
      >
        上一页
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="px-2.5 py-1 text-xs rounded-md font-mono"
          style={{
            border: '1px solid var(--border)',
            background: p === page ? 'var(--accent-blue)' : 'transparent',
            color: p === page ? 'var(--accent-blue-foreground)' : 'var(--foreground)',
          }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-2 py-1 text-xs rounded-md"
        style={{ border: '1px solid var(--border)', color: 'var(--foreground)', opacity: page === totalPages ? 0.5 : 1 }}
      >
        下一页
      </button>
      <button
        onClick={() => onChange(totalPages)}
        disabled={page === totalPages}
        className="px-2 py-1 text-xs rounded-md"
        style={{ border: '1px solid var(--border)', color: 'var(--foreground)', opacity: page === totalPages ? 0.5 : 1 }}
      >
        末页
      </button>
    </div>
  );
}
