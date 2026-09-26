/**
 * 论坛模块共享类型、常量、辅助函数与小组件
 * 复用 resources/shared.tsx 中的通用组件（LoadingBlock / ErrorBlock / EmptyState 等）
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Star,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { LoginPrompt } from '@/components/shared/LoginPrompt';
import {
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  Breadcrumb,
  PageHeader,
  formatNumber,
  formatRelativeTime,
  formatDate,
} from '@/components/resources/shared';

// 复用通用组件
export {
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  Breadcrumb,
  PageHeader,
  formatNumber,
  formatRelativeTime,
  formatDate,
};

// ===== Types =====

export interface Author {
  id: string | number;
  username: string;
  avatar_url?: string | null;
}

export interface Topic {
  id: string | number;
  title: string;
  category: string;
  views_count: number;
  replies_count: number;
  followers_count: number;
  created_at: string;
  last_reply_at?: string;
  author: Author;
}

export interface Reply {
  id: string | number;
  content: string;
  created_at: string;
  author: Author;
  parent_id?: string | number | null;
  votes_count: number;
}

export interface TopicDetail extends Topic {
  content: string;
  replies: Reply[];
}

export interface Article {
  id: string | number;
  title: string;
  summary: string;
  cover_image?: string | null;
  views_count: number;
  comments_count: number;
  likes_count: number;
  created_at: string;
  author: Author;
}

export interface Comment {
  id: string | number;
  content: string;
  created_at: string;
  author: Author;
  parent_id?: string | number | null;
  votes_count?: number;
}

export interface ArticleDetail extends Article {
  content: string;
  comments: Comment[];
}

export interface Question {
  id: string | number;
  title: string;
  answers_count: number;
  views_count: number;
  is_solved: boolean;
  bounty?: number;
  created_at: string;
  author: Author;
}

export interface Answer {
  id: string | number;
  content: string;
  created_at: string;
  is_accepted: boolean;
  author: Author;
  votes_count: number;
}

export interface QuestionDetail extends Question {
  content: string;
  supplement?: string;
  answers: Answer[];
  accepted_answer: Answer | null;
}

// ===== Response Types =====

export interface TopicListResponse {
  success: boolean;
  items: Topic[];
  total: number;
  page?: number;
  size?: number;
}

export interface ArticleListResponse {
  success: boolean;
  items: Article[];
  total: number;
  page?: number;
  size?: number;
}

export interface QuestionListResponse {
  success: boolean;
  items: Question[];
  total: number;
  page?: number;
  size?: number;
}

export interface TopicDetailResponse {
  success: boolean;
  topic: TopicDetail;
}

export interface ArticleDetailResponse {
  success: boolean;
  article: ArticleDetail;
}

export interface QuestionDetailResponse {
  success: boolean;
  question: QuestionDetail;
}

// ===== Constants =====

export type PostType = 'topic' | 'article' | 'question';

export interface PostTypeMeta {
  key: PostType;
  label: string;
  singular: string;
  icon: LucideIcon;
  desc: string;
  color: string;
  href: string;
}

export const POST_TYPES: PostTypeMeta[] = [
  {
    key: 'topic',
    label: '讨论区',
    singular: '话题',
    icon: MessageSquare,
    desc: '自由讨论各种话题',
    color: 'var(--accent-blue)',
    href: '/forum/topics',
  },
  {
    key: 'article',
    label: '文章区',
    singular: '文章',
    icon: FileText,
    desc: '教程、评测、分享',
    color: 'var(--color-purple)',
    href: '/forum/articles',
  },
  {
    key: 'question',
    label: '问答区',
    singular: '问题',
    icon: HelpCircle,
    desc: '提问与解答',
    color: 'var(--color-success)',
    href: '/forum/questions',
  },
];

export function getPostTypeMeta(type: string | undefined | null): PostTypeMeta {
  if (!type) return POST_TYPES[0];
  return POST_TYPES.find((t) => t.key === type) ?? POST_TYPES[0];
}

export interface CategoryMeta {
  key: string;
  label: string;
  desc: string;
}

export const FORUM_CATEGORIES: CategoryMeta[] = [
  { key: 'general', label: '综合讨论', desc: '自由讨论各类话题' },
  { key: 'tech', label: '技术支持', desc: '技术问题与解答' },
  { key: 'resources', label: '资源分享', desc: '分享好用的资源' },
  { key: 'feedback', label: '反馈建议', desc: '产品反馈与建议' },
  { key: 'water', label: '灌水闲聊', desc: '轻松闲聊' },
];

export function getCategoryMeta(key: string | undefined | null): CategoryMeta | null {
  if (!key) return null;
  return FORUM_CATEGORIES.find((c) => c.key === key) ?? null;
}

export function getCategoryLabel(key: string | undefined | null): string {
  return getCategoryMeta(key)?.label ?? key ?? '';
}

// 话题排序选项
export const TOPIC_SORT_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'newest', label: '最新' },
  { key: 'hot', label: '热门' },
  { key: 'replies', label: '回复数' },
];

// 文章排序选项
export const ARTICLE_SORT_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'newest', label: '最新' },
  { key: 'hot', label: '热门' },
];

// 问题状态筛选
export const QUESTION_STATUS_OPTIONS: Array<{ key: string; label: string }> = [
  { key: '', label: '全部' },
  { key: 'unsolved', label: '未解决' },
  { key: 'solved', label: '已解决' },
  { key: 'bounty', label: '有悬赏' },
];

// ===== Helpers =====

/** 取用户名首字母用于头像占位 */
export function getInitials(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    // 中文名取最后一个字
    return trimmed.slice(-1);
  }
  // 英文名取前两个字母
  return trimmed.slice(0, 2).toUpperCase();
}

/** 帖子类型对应的详情页链接 */
export function getDetailHref(type: PostType, id: string | number): string {
  switch (type) {
    case 'topic':
      return `/forum/topic?id=${encodeURIComponent(String(id))}`;
    case 'article':
      return `/forum/article?id=${encodeURIComponent(String(id))}`;
    case 'question':
      return `/forum/question?id=${encodeURIComponent(String(id))}`;
  }
}

/** 回复/评论树节点 */
export interface ReplyTreeNode<T> {
  node: T;
  children: ReplyTreeNode<T>[];
}

/** 将扁平回复列表构建为树 */
export function buildReplyTree<T extends { id: string | number; parent_id?: string | number | null }>(
  items: T[]
): ReplyTreeNode<T>[] {
  const map = new Map<string | number, ReplyTreeNode<T>>();
  const roots: ReplyTreeNode<T>[] = [];

  items.forEach((item) => {
    map.set(item.id, { node: item, children: [] });
  });

  items.forEach((item) => {
    const treeNode = map.get(item.id)!;
    if (item.parent_id != null && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  });

  return roots;
}

// ===== Shared Components =====

export interface AvatarProps {
  author: Author;
  size?: number;
  href?: string;
}

export function Avatar({ author, size = 36, href }: AvatarProps) {
  const initials = getInitials(author.username || '?');
  // 已注销账号：用户名匹配 "已注销账号-{数字}" 格式
  const isDeactivated = /^已注销账号-\d+$/.test(author.username || '');
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: size * 0.4,
    fontWeight: 600,
    // 已注销账号使用灰色渐变，否则使用品牌色渐变
    background: isDeactivated
      ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
      : 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
    color: isDeactivated ? '#f3f4f6' : 'var(--accent-blue)',
    // 已注销账号头像应用灰色滤镜（即使有 avatar_url 也强制灰化）
    filter: isDeactivated ? 'grayscale(1)' : undefined,
    overflow: 'hidden',
    textDecoration: 'none',
  };
  // 已注销账号不显示真实头像（强制使用首字母占位）
  const avatarSrc = author.avatar_url ?? undefined;
  const showImage = avatarSrc && !isDeactivated;
  const inner = showImage ? (
    <img
      src={avatarSrc}
      alt={author.username}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : (
    <span>{initials}</span>
  );
  if (href) {
    return (
      <Link to={href} style={style} title={author.username}>
        {inner}
      </Link>
    );
  }
  return (
    <span style={style} title={author.username}>
      {inner}
    </span>
  );
}

export interface PostTypeIconProps {
  type: PostType;
  size?: number;
}

export function PostTypeIcon({ type, size = 16 }: PostTypeIconProps) {
  const meta = getPostTypeMeta(type);
  const Icon = meta.icon;
  return <Icon size={size} style={{ color: meta.color }} />;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const pageNumbers = useMemo(() => {
    const result: Array<number | '...'> = [];
    const max = totalPages;
    if (max <= 7) {
      for (let i = 1; i <= max; i++) result.push(i);
    } else {
      result.push(1);
      if (page > 3) result.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(max - 1, page + 1);
      for (let i = start; i <= end; i++) result.push(i);
      if (page < max - 2) result.push('...');
      result.push(max);
    }
    return result;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  const baseBtn: React.CSSProperties = {
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--foreground)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    transition: 'background-color 0.16s ease, border-color 0.16s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const activeBtn: React.CSSProperties = {
    ...baseBtn,
    background: 'var(--btn-bg)',
    color: 'var(--btn-blue-fg)',
    borderColor: 'var(--btn-bg)',
  };
  const disabledBtn: React.CSSProperties = {
    ...baseBtn,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  return (
    <nav
      className="flex items-center justify-center gap-2 flex-wrap"
      style={{ marginTop: 32 }}
      aria-label="分页"
    >
      <button
        style={page <= 1 ? disabledBtn : baseBtn}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一页"
        onMouseEnter={(e) => {
          if (page > 1) e.currentTarget.style.borderColor = 'var(--accent-blue)';
        }}
        onMouseLeave={(e) => {
          if (page > 1) e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <ChevronLeft size={16} />
      </button>
      {pageNumbers.map((n, i) =>
        n === '...' ? (
          <span
            key={`ellipsis-${i}`}
            style={{ color: 'var(--muted-foreground)', padding: '0 4px' }}
          >
            …
          </span>
        ) : (
          <button
            key={n}
            style={n === page ? activeBtn : baseBtn}
            onClick={() => onChange(n)}
            onMouseEnter={(e) => {
              if (n !== page) e.currentTarget.style.borderColor = 'var(--accent-blue)';
            }}
            onMouseLeave={(e) => {
              if (n !== page) e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {n}
          </button>
        )
      )}
      <button
        style={page >= totalPages ? disabledBtn : baseBtn}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="下一页"
        onMouseEnter={(e) => {
          if (page < totalPages) e.currentTarget.style.borderColor = 'var(--accent-blue)';
        }}
        onMouseLeave={(e) => {
          if (page < totalPages) e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

// ===== 投票按钮 =====

export interface VoteButtonProps {
  targetType: 'topic' | 'article' | 'question' | 'answer' | 'reply';
  targetId: string | number;
  initialVotes: number;
  size?: 'sm' | 'md';
}

export function VoteButton({ targetType, targetId, initialVotes, size = 'md' }: VoteButtonProps) {
  const { user } = useAuth();
  const [votes, setVotes] = useState(initialVotes);
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState<1 | -1 | 0>(0);

  const handleVote = async (value: 1 | -1) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; votes_count: number }>('/forum/vote.php', {
        target_type: targetType,
        target_id: targetId,
        value,
      });
      setVotes(res.votes_count);
      setVoted(voted === value ? 0 : value);
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('投票失败');
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 14 : 16;
  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: size === 'sm' ? '4px 8px' : '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--muted-foreground)',
    fontSize: size === 'sm' ? 12 : 13,
    cursor: user ? 'pointer' : 'default',
    transition: 'all 0.16s ease',
  };

  const upBtnStyle: React.CSSProperties = {
    ...btnStyle,
    color: voted === 1 ? 'var(--color-success)' : 'var(--muted-foreground)',
    borderColor: voted === 1 ? 'var(--color-success)' : 'var(--border)',
  };
  const downBtnStyle: React.CSSProperties = {
    ...btnStyle,
    color: voted === -1 ? 'var(--destructive)' : 'var(--muted-foreground)',
    borderColor: voted === -1 ? 'var(--destructive)' : 'var(--border)',
  };

  const upTrigger = (
    <button style={upBtnStyle} disabled={loading}>
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : <ThumbsUp size={iconSize} />}
      <span style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(votes)}</span>
    </button>
  );
  const downTrigger = (
    <button style={downBtnStyle} disabled={loading}>
      <ThumbsDown size={iconSize} />
    </button>
  );

  return (
    <div className="inline-flex items-center gap-2">
      {user ? (
        <>
          <span onClick={() => handleVote(1)} style={{ cursor: 'pointer', display: 'inline-flex' }}>
            {upTrigger}
          </span>
          <span onClick={() => handleVote(-1)} style={{ cursor: 'pointer', display: 'inline-flex' }}>
            {downTrigger}
          </span>
        </>
      ) : (
        <>
          <LoginPrompt trigger={upTrigger} message="需要登录才能投票" />
          <LoginPrompt trigger={downTrigger} message="需要登录才能投票" />
        </>
      )}
    </div>
  );
}

// ===== 关注按钮 =====

export interface FollowButtonProps {
  targetType: 'topic' | 'article' | 'question' | 'user';
  targetId: string | number;
  initialFollowing?: boolean;
  label?: string;
}

export function FollowButton({
  targetType,
  targetId,
  initialFollowing = false,
  label = '关注',
}: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; following: boolean }>('/forum/follow.php', {
        target_type: targetType,
        target_id: targetId,
      });
      setFollowing(res.following);
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    border: following ? '1px solid var(--border)' : '1px solid var(--accent-blue)',
    background: following ? 'transparent' : 'var(--accent-blue)',
    color: following ? 'var(--foreground)' : 'var(--accent-blue-foreground)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.16s ease',
  };

  const trigger = (
    <button style={btnStyle} disabled={loading}>
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Star size={14} style={{ fill: following ? 'var(--color-star)' : 'none', color: following ? 'var(--color-star)' : 'currentColor' }} />
      )}
      {following ? '已关注' : label}
    </button>
  );

  if (!user) {
    return <LoginPrompt trigger={trigger} message="需要登录才能关注" />;
  }
  return <span onClick={handleFollow} style={{ cursor: 'pointer', display: 'inline-flex' }}>{trigger}</span>;
}

// ===== Feed 项（用于首页混合动态流） =====

export interface FeedItem {
  type: PostType;
  id: string | number;
  title: string;
  created_at: string;
  author: Author;
  excerpt?: string;
  category?: string;
  is_solved?: boolean;
  bounty?: number;
}

/** 将时间戳解析为可比较的数字 */
function timeToNum(t: string | undefined): number {
  if (!t) return 0;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** 合并多个 feed 列表，按时间倒序 */
export function mergeFeeds(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => timeToNum(b.created_at) - timeToNum(a.created_at));
}
