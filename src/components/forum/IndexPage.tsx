import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  MessageSquare,
  FileText,
  HelpCircle,
  Eye,
  Reply,
  Flame,
  TrendingUp,
  Hash,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  POST_TYPES,
  getPostTypeMeta,
  getCategoryLabel,
  PageContainer,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  Avatar,
  PostTypeIcon,
  formatNumber,
  formatRelativeTime,
  getDetailHref,
  mergeFeeds,
  type PostType,
  type FeedItem,
  type Topic,
  type Article,
  type Question,
  type TopicListResponse,
  type ArticleListResponse,
  type QuestionListResponse,
} from './shared';

// 三入口卡片
function EntryCard({ type }: { type: PostType }) {
  const meta = getPostTypeMeta(type);
  const Icon = meta.icon;
  return (
    <Link
      to={meta.href}
      className="bento-card flex flex-col gap-3 transition-shadow"
      style={{ gridColumn: 'span 4', padding: 24, textDecoration: 'none' }}
    >
      <div className="flex items-start justify-between">
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-blue-soft)',
            color: meta.color,
          }}
        >
          <Icon size={24} />
        </span>
        <span style={{ color: 'var(--muted-foreground)' }}>
          <ArrowRight size={16} />
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          color: 'var(--foreground)',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {meta.label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        {meta.desc}
      </div>
      <span
        className="inline-flex items-center gap-1 mt-auto"
        style={{ fontSize: 13, color: 'var(--accent-blue)' }}
      >
        进入
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}

// 动态流项
function FeedListItem({ item }: { item: FeedItem }) {
  const meta = getPostTypeMeta(item.type);
  return (
    <Link
      to={getDetailHref(item.type, item.id)}
      className="flex items-start gap-3 p-3 transition-colors"
      style={{
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        borderBottom: '1px solid var(--border)',
      }}
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
          color: meta.color,
        }}
      >
        <PostTypeIcon type={item.type} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="font-medium truncate"
          style={{ color: 'var(--foreground)', fontSize: 14 }}
          title={item.title}
        >
          {item.title}
        </div>
        <div
          className="flex items-center gap-2 mt-1"
          style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
        >
          <span>{item.author?.username || '匿名'}</span>
          <span>·</span>
          <span>{formatRelativeTime(item.created_at)}</span>
          {item.category && (
            <>
              <span>·</span>
              <span style={{ color: meta.color }}>{getCategoryLabel(item.category)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// 侧栏热门话题项
function HotTopicItem({ topic }: { topic: Topic }) {
  return (
    <Link
      to={getDetailHref('topic', topic.id)}
      className="flex items-start gap-2 p-2 transition-colors"
      style={{ borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Hash size={14} style={{ color: 'var(--accent-blue)', marginTop: 2, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <div
          className="font-medium truncate"
          style={{ color: 'var(--foreground)', fontSize: 13 }}
          title={topic.title}
        >
          {topic.title}
        </div>
        <div
          className="flex items-center gap-2 mt-0.5"
          style={{ fontSize: 11, color: 'var(--muted-foreground)' }}
        >
          <span className="inline-flex items-center gap-1">
            <Reply size={10} />
            {formatNumber(topic.replies_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={10} />
            {formatNumber(topic.views_count)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// 统计数字卡
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{
        borderRadius: 'var(--radius-sm)',
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-blue-soft)',
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--foreground)',
          }}
        >
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{label}</div>
      </div>
    </div>
  );
}

export default function IndexPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [hotTopics, setHotTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState({ topics: 0, articles: 0, questions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [topicsRes, articlesRes, questionsRes, hotRes] = await Promise.all([
          api.get<TopicListResponse>('/forum/topics.php?size=5&sort=newest'),
          api.get<ArticleListResponse>('/forum/articles.php?size=5&sort=newest'),
          api.get<QuestionListResponse>('/forum/questions.php?size=5'),
          api.get<TopicListResponse>('/forum/topics.php?size=5&sort=hot'),
        ]);
        if (cancelled) return;

        const topicFeed: FeedItem[] = (topicsRes.items ?? []).map((t) => ({
          type: 'topic' as PostType,
          id: t.id,
          title: t.title,
          created_at: t.created_at,
          author: t.author,
          category: t.category,
        }));
        const articleFeed: FeedItem[] = (articlesRes.items ?? []).map((a) => ({
          type: 'article' as PostType,
          id: a.id,
          title: a.title,
          created_at: a.created_at,
          author: a.author,
          excerpt: a.summary,
        }));
        const questionFeed: FeedItem[] = (questionsRes.items ?? []).map((q) => ({
          type: 'question' as PostType,
          id: q.id,
          title: q.title,
          created_at: q.created_at,
          author: q.author,
          is_solved: q.is_solved,
          bounty: q.bounty,
        }));

        setFeed(mergeFeeds([...topicFeed, ...articleFeed, ...questionFeed]));
        setHotTopics(hotRes.items ?? []);
        setStats({
          topics: topicsRes.total ?? 0,
          articles: articlesRes.total ?? 0,
          questions: questionsRes.total ?? 0,
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载论坛数据失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      {/* 标题区 + 发帖按钮 */}
      <section
        className="flex items-end justify-between gap-4 flex-wrap"
        style={{ paddingTop: 48, paddingBottom: 24 }}
      >
        <div className="flex flex-col gap-3">
          <div
            className="inline-flex items-center gap-2"
            style={{
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent-blue)',
              }}
            />
            <span>Forum</span>
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
            Air 社区论坛
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted-foreground)', margin: 0 }}>
            与社区成员交流、分享、学习
          </p>
        </div>
        <Link to="/forum/new-post" className="btn-blue btn-lg">
          <Plus size={18} />
          发布内容
        </Link>
      </section>

      {/* 三入口卡片 */}
      <section className="bento-grid" style={{ marginBottom: 48 }}>
        {POST_TYPES.map((t) => (
          <EntryCard key={t.key} type={t.key} />
        ))}
      </section>

      {/* 两栏：主内容 + 侧边栏 */}
      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: '1fr 320px', alignItems: 'flex-start' }}
      >
        {/* 左侧动态流 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                color: 'var(--foreground)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              <TrendingUp size={20} style={{ color: 'var(--accent-blue)' }} />
              最新动态
            </h2>
          </div>
          {loading ? (
            <LoadingBlock />
          ) : error ? (
            <ErrorBlock message={error} />
          ) : feed.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={32} />}
              title="暂无动态"
              desc="还没有人发帖，快来发布第一个吧"
              action={
                <Link to="/forum/new-post" className="btn-blue">
                  <Plus size={16} />
                  发布内容
                </Link>
              }
            />
          ) : (
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}
            >
              {feed.map((item, idx) => (
                <FeedListItem key={`${item.type}-${item.id}-${idx}`} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* 右侧侧栏 */}
        <aside className="flex flex-col gap-6" style={{ position: 'sticky', top: 88 }}>
          {/* 热门话题 */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: 16,
            }}
          >
            <h3
              className="flex items-center gap-2 mb-3"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}
            >
              <Flame size={16} style={{ color: 'var(--color-warning)' }} />
              热门话题
            </h3>
            {loading ? (
              <LoadingBlock label="加载中..." />
            ) : hotTopics.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '8px 0' }}>
                暂无热门话题
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {hotTopics.map((t) => (
                  <HotTopicItem key={t.id} topic={t} />
                ))}
              </div>
            )}
          </div>

          {/* 统计数字 */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: 16,
            }}
          >
            <h3
              className="flex items-center gap-2 mb-3"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}
            >
              <Hash size={16} style={{ color: 'var(--accent-blue)' }} />
              社区统计
            </h3>
            <div className="flex flex-col gap-2">
              <StatCard
                icon={<MessageSquare size={16} />}
                label="话题总数"
                value={stats.topics}
                color="var(--accent-blue)"
              />
              <StatCard
                icon={<FileText size={16} />}
                label="文章总数"
                value={stats.articles}
                color="var(--color-purple)"
              />
              <StatCard
                icon={<HelpCircle size={16} />}
                label="问题总数"
                value={stats.questions}
                color="var(--color-success)"
              />
            </div>
          </div>

          {/* 快捷链接 */}
          <div className="flex flex-col gap-2">
            <Link to="/forum/new-post" className="btn-blue btn-block">
              <Plus size={16} />
              发帖
            </Link>
            <Link to="/forum/topics" className="btn-outline btn-block">
              查看全部话题
            </Link>
            <Link to="/forum/articles" className="btn-outline btn-block">
              查看全部文章
            </Link>
            <Link to="/forum/questions" className="btn-outline btn-block">
              查看全部问答
            </Link>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
