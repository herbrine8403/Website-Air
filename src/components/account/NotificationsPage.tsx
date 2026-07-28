import { useEffect, useState, useRef } from 'react';
import {
  Bell,
  Check,
  MessageSquare,
  Heart,
  Download,
  Info,
  AlertCircle,
  Loader2,
  Send,
  CheckCheck,
  ChevronLeft,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth, type AuthUser } from '@/hooks/useAuth';

type TabKey = 'notifications' | 'inbox';
type FilterKey = 'all' | 'unread' | 'resource' | 'forum' | 'system';

interface NotificationItem {
  id: string;
  type: string; // resource_comment | forum_reply | system | follow | like | resource_update | etc.
  title: string;
  content: string | null;
  source_type: string | null;
  source_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
  pagination: { page: number; size: number; total: number; total_pages: number };
}

interface ConversationItem {
  id: string;
  other_user: { id: string; username: string; avatar_url: string | null };
  last_message: { content: string | null; created_at: string };
  unread_count: number;
  last_message_at: string;
  created_at: string;
}

interface InboxMessage {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
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

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

// 通知类型 → 图标 & 颜色
function getNotifIcon(type: string): { Icon: typeof Bell; color: string } {
  switch (type) {
    case 'resource_comment':
    case 'resource_update':
    case 'resource_review':
      return { Icon: MessageSquare, color: 'blue' };
    case 'forum_reply':
    case 'forum_mention':
      return { Icon: MessageSquare, color: 'purple' };
    case 'like':
    case 'vote':
      return { Icon: Heart, color: 'red' };
    case 'follow':
      return { Icon: Heart, color: 'green' };
    case 'download_milestone':
      return { Icon: Download, color: 'green' };
    case 'system':
    default:
      return { Icon: Info, color: 'gray' };
  }
}

const FILTER_MAP: Record<FilterKey, { label: string; apiParam: string }> = {
  all: { label: '全部', apiParam: '' },
  unread: { label: '未读', apiParam: '' },
  resource: { label: '资源', apiParam: 'resource' },
  forum: { label: '论坛', apiParam: 'forum' },
  system: { label: '系统', apiParam: 'system' },
};

export default function NotificationsPage() {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('notifications');

  return (
    <div className="mx-auto max-w-[1280px] px-6" style={{ paddingTop: 40, paddingBottom: 80 }}>
      {/* 页面标题区 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>
        <div
          className="eyebrow"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)' }} />
          Notifications
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 40,
            lineHeight: 1.1,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
            margin: 0,
          }}
        >
          消息通知
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted-foreground)', margin: 0 }}>查看你的所有通知与私信</p>
      </div>

      {/* 顶部 Tab 切换 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
          overflowX: 'auto',
        }}
      >
        <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
          <Bell size={16} />
          通知
        </TabButton>
        <TabButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')}>
          <MessageSquare size={16} />
          私信
        </TabButton>
      </div>

      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'inbox' && <InboxTab authUser={authUser} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '12px 18px',
        fontSize: 14,
        fontWeight: 500,
        color: active ? 'var(--accent-blue)' : 'var(--muted-foreground)',
        borderBottom: `2px solid ${active ? 'var(--accent-blue)' : 'transparent'}`,
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
      {children}
    </button>
  );
}

/* ====================== 通知 Tab ====================== */

function NotificationsTab() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('unread', '1');
      else if (filter !== 'all') params.set('type', FILTER_MAP[filter].apiParam);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<NotificationListResponse>(`/account/notifications.php${qs}`);
      setItems(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleMarkAllRead = async () => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await api.post('/account/notifications.php', { all: true });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setActionPending(false);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    if (actionPending) return;
    setActionPending(true);
    try {
      await api.post('/account/notifications.php', { id: Number(id) });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setActionPending(false);
    }
  };

  const counts: Record<FilterKey, number> = {
    all: items.length,
    unread: items.filter((n) => !n.is_read).length,
    resource: items.filter((n) => n.type?.startsWith('resource')).length,
    forum: items.filter((n) => n.type?.startsWith('forum')).length,
    system: items.filter((n) => n.type === 'system').length,
  };

  return (
    <>
      {/* 通知摘要 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--muted-foreground)',
          marginBottom: 4,
        }}
      >
        <Bell size={16} />
        你有 <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{unreadCount} 条未读通知</span>
      </div>

      {/* 顶部操作栏 */}
      <div
        className="notif-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
          marginTop: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(FILTER_MAP) as FilterKey[]).map((key) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: isActive ? 'var(--accent-blue)' : 'var(--card)',
                  border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border)'}`,
                  color: isActive ? 'var(--accent-blue-foreground)' : 'var(--muted-foreground)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease',
                  cursor: 'pointer',
                }}
              >
                {FILTER_MAP[key].label}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--muted)',
                    color: isActive ? 'var(--accent-blue-foreground)' : 'var(--muted-foreground)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={actionPending || unreadCount === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 'var(--radius)',
            background: 'transparent',
            color: 'var(--muted-foreground)',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            cursor: actionPending || unreadCount === 0 ? 'not-allowed' : 'pointer',
            opacity: actionPending || unreadCount === 0 ? 0.5 : 1,
            transition: 'color 0.16s ease, background-color 0.16s ease',
          }}
          onMouseEnter={(e) => {
            if (!actionPending && unreadCount > 0) {
              e.currentTarget.style.color = 'var(--foreground)';
              e.currentTarget.style.background = 'var(--muted)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted-foreground)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CheckCheck size={16} />
          全部标记为已读
        </button>
      </div>

      {error && (
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
            marginBottom: 16,
          }}
          role="alert"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* 通知列表 */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--muted-foreground)' }}>
          <Loader2 className="animate-spin" size={20} />
          <span style={{ marginLeft: 8 }}>加载中...</span>
        </div>
      ) : items.length === 0 ? (
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
          <Bell size={40} style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>暂无通知</div>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>新的通知会显示在这里</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((n) => {
            const { Icon, color } = getNotifIcon(n.type);
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: n.is_read ? '16px 20px' : '16px 17px 16px 20px',
                  background: n.is_read ? 'var(--card)' : 'linear-gradient(90deg, rgba(68, 118, 213, 0.04) 0%, var(--card) 30%)',
                  border: '1px solid var(--border)',
                  borderLeft: n.is_read ? '1px solid var(--border)' : '3px solid var(--accent-blue)',
                  borderRadius: 'var(--radius)',
                  transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
                  position: 'relative',
                }}
              >
                <NotifIcon Icon={Icon} color={color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: n.is_read ? 'var(--foreground)' : 'var(--accent-blue)',
                      lineHeight: 1.4,
                    }}
                  >
                    {n.title}
                  </div>
                  {n.content && (
                    <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{n.content}</div>
                  )}
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatRelative(n.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  {!n.is_read && (
                    <span
                      aria-label="未读"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-blue)',
                        boxShadow: '0 0 0 4px rgba(68, 118, 213, 0.15)',
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkOneRead(n.id)}
                        disabled={actionPending}
                        title="标记已读"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--muted-foreground)',
                          fontSize: 12,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.16s ease, color 0.16s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--muted)';
                          e.currentTarget.style.color = 'var(--foreground)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--muted-foreground)';
                        }}
                      >
                        <Check size={14} />
                        已读
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NotifIcon({ Icon, color }: { Icon: typeof Bell; color: string }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    blue: { bg: 'var(--accent-blue-soft)', fg: 'var(--accent-blue)' },
    green: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    orange: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
    purple: { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple)' },
    gray: { bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
    red: { bg: 'var(--color-danger-soft)', fg: 'var(--destructive)' },
  };
  const c = colorMap[color] || colorMap.gray;
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: c.bg,
        color: c.fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={20} />
    </div>
  );
}

/* ====================== 私信 Tab ====================== */

interface InboxListResponse {
  conversations: ConversationItem[];
}

interface InboxMessagesResponse {
  messages: InboxMessage[];
  conversation_id: string;
}

function InboxTab({ authUser }: { authUser: AuthUser | null }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await api.get<InboxListResponse>('/account/inbox.php');
      setConversations(res.conversations || []);
      if (res.conversations && res.conversations.length > 0 && !activeConv) {
        setActiveConv(res.conversations[0]);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载会话列表失败');
    } finally {
      setLoadingList(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await api.get<InboxMessagesResponse>(`/account/inbox.php?conversation_id=${convId}`);
      setMessages(res.messages || []);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) loadMessages(activeConv.id);
  }, [activeConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || !activeConv || sending) return;
    setSending(true);
    const content = draft.trim();
    setDraft('');
    try {
      const res = await api.post<{ message: InboxMessage; conversation_id: string }>('/account/inbox.php', {
        conversation_id: Number(activeConv.id),
        content,
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
      // 更新会话列表中最后一条消息
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message: { content, created_at: new Date().toISOString() }, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="inbox-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 16,
        minHeight: 520,
      }}
    >
      {/* 左侧会话列表 */}
      <div
        className="inbox-list"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--foreground)',
          }}
        >
          会话
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 520 }}>
          {loadingList ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--muted-foreground)' }}>
              <Loader2 className="animate-spin" size={18} />
              <span style={{ marginLeft: 8, fontSize: 13 }}>加载中...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 16px',
                textAlign: 'center',
                gap: 8,
                color: 'var(--muted-foreground)',
                fontSize: 13,
              }}
            >
              <MessageSquare size={32} style={{ opacity: 0.5 }} />
              <div>暂无私信</div>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = activeConv?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConv(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: isActive ? 'var(--muted)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background-color 0.16s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--accent-blue-soft)',
                      color: 'var(--accent-blue)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 13,
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {c.other_user.avatar_url ? (
                      <img src={c.other_user.avatar_url} alt={c.other_user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getInitials(c.other_user.username)
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.other_user.username}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {c.last_message?.created_at ? formatTime(c.last_message.created_at) : ''}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--muted-foreground)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {c.last_message?.content || '暂无消息'}
                      </span>
                      {c.unread_count > 0 && (
                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            padding: '0 5px',
                            borderRadius: 999,
                            background: 'var(--accent-blue)',
                            color: 'var(--accent-blue-foreground)',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧消息窗 */}
      <div
        className="inbox-messages"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 520,
        }}
      >
        {activeConv ? (
          <>
            {/* 消息头部 */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <ChevronLeft size={18} style={{ color: 'var(--muted-foreground)' }} />
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--accent-blue-soft)',
                  color: 'var(--accent-blue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 12,
                  overflow: 'hidden',
                }}
              >
                {activeConv.other_user.avatar_url ? (
                  <img src={activeConv.other_user.avatar_url} alt={activeConv.other_user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(activeConv.other_user.username)
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{activeConv.other_user.username}</div>
            </div>

            {/* 消息内容 */}
            <div
              style={{
                flex: 1,
                padding: 20,
                overflowY: 'auto',
                maxHeight: 420,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    background: 'rgba(220, 38, 38, 0.06)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--destructive)',
                    fontSize: 12,
                  }}
                  role="alert"
                >
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              {loadingMsgs ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--muted-foreground)' }}>
                  <Loader2 className="animate-spin" size={18} />
                  <span style={{ marginLeft: 8, fontSize: 13 }}>加载中...</span>
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: 13,
                    gap: 8,
                  }}
                >
                  <MessageSquare size={32} style={{ opacity: 0.5 }} />
                  <div>还没有消息，发送一条私信开始对话吧</div>
                </div>
              ) : (
                messages.map((m) => {
                  const isSelf = authUser && m.sender_id === authUser.id;
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: isSelf ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius)',
                          background: isSelf ? 'var(--accent-blue)' : 'var(--muted)',
                          color: isSelf ? 'var(--accent-blue-foreground)' : 'var(--foreground)',
                          fontSize: 14,
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        <div>{m.content}</div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--muted-foreground)',
                            fontFamily: 'var(--font-mono)',
                            textAlign: isSelf ? 'right' : 'left',
                          }}
                        >
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div
              style={{
                padding: 16,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="输入消息..."
                rows={1}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  resize: 'none',
                  minHeight: 42,
                  maxHeight: 120,
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(68, 118, 213, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--btn-bg)',
                  color: 'var(--btn-blue-fg)',
                  fontSize: 14,
                  fontWeight: 500,
                  border: 'none',
                  cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !draft.trim() ? 0.5 : 1,
                  transition: 'background-color 0.16s ease',
                  flexShrink: 0,
                }}
              >
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                发送
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: 48,
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              gap: 12,
            }}
          >
            <MessageSquare size={48} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>选择一个会话</div>
            <div style={{ fontSize: 14 }}>从左侧选择一个会话开始查看消息</div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .inbox-layout { grid-template-columns: 1fr !important; }
          .inbox-list { max-height: 240px; }
        }
      `}</style>
    </div>
  );
}
