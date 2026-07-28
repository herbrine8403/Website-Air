import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, MessageSquare, Reply, Eye, ChevronDown } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  FORUM_CATEGORIES,
  TOPIC_SORT_OPTIONS,
  getCategoryLabel,
  PageContainer,
  Breadcrumb,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  Avatar,
  Pagination,
  formatNumber,
  formatRelativeTime,
  getDetailHref,
  type Topic,
  type TopicListResponse,
} from './shared';

const CATEGORY_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: '全部' },
  ...FORUM_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
];

export default function TopicsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState<Topic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 同步 URL
  const syncUrl = useCallback(
    (next: { category: string; sort: string; page: number }) => {
      const params: Record<string, string> = {};
      if (next.category) params.category = next.category;
      if (next.sort && next.sort !== 'newest') params.sort = next.sort;
      if (next.page > 1) params.page = String(next.page);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        params.set('sort', sort);
        params.set('page', String(page));
        params.set('size', String(pageSize));
        const res = await api.get<TopicListResponse>(`/forum/topics.php?${params.toString()}`);
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载话题列表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, sort, page]);

  const handleCategoryChange = (key: string) => {
    setCategory(key);
    setPage(1);
    syncUrl({ category: key, sort, page: 1 });
  };

  const handleSortChange = (key: string) => {
    setSort(key);
    setPage(1);
    setSortOpen(false);
    syncUrl({ category, sort: key, page: 1 });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    syncUrl({ category, sort, page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSortLabel = TOPIC_SORT_OPTIONS.find((s) => s.key === sort)?.label || '最新';

  return (
    <PageContainer>
      <Breadcrumb
        items={[{ label: '论坛', href: '/forum' }, { label: '讨论区' }]}
      />

      {/* 标题区 */}
      <section
        className="flex items-end justify-between gap-4 flex-wrap"
        style={{ paddingBottom: 24 }}
      >
        <div className="flex flex-col gap-2">
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
            <span>Forum / Topics</span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              lineHeight: 1.1,
              color: 'var(--foreground)',
              letterSpacing: 'var(--tracking-tight)',
              margin: 0,
            }}
          >
            讨论区
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0 }}>
            自由讨论各类话题
          </p>
        </div>
        <Link to="/forum/new-post?type=topic" className="btn-blue">
          <Plus size={16} />
          发话题
        </Link>
      </section>

      {/* 筛选 + 排序栏 */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{ marginBottom: 24 }}
      >
        {/* 分类 tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.key;
            return (
              <button
                key={tab.key || 'all'}
                onClick={() => handleCategoryChange(tab.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-blue)' : 'transparent',
                  color: active ? 'var(--accent-blue-foreground)' : 'var(--muted-foreground)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 排序下拉 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-2"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            排序：{currentSortLabel}
            <ChevronDown size={14} />
          </button>
          {sortOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setSortOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 50,
                  minWidth: 140,
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-md)',
                  padding: 4,
                }}
              >
                {TOPIC_SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleSortChange(opt.key)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: sort === opt.key ? 'var(--muted)' : 'transparent',
                      color: sort === opt.key ? 'var(--accent-blue)' : 'var(--foreground)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 话题列表 */}
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="暂无话题"
          desc="还没有人发话题，快来发布第一个吧"
          action={
            <Link to="/forum/new-post?type=topic" className="btn-blue">
              <Plus size={16} />
              发话题
            </Link>
          }
        />
      ) : (
        <>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            {/* 表头 */}
            <div
              className="flex items-center gap-4"
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--muted)',
                fontSize: 12,
                color: 'var(--muted-foreground)',
                fontWeight: 600,
              }}
            >
              <span style={{ flex: 1 }}>话题</span>
              <span style={{ width: 100, textAlign: 'center' }}>回复</span>
              <span style={{ width: 100, textAlign: 'center' }}>查看</span>
              <span style={{ width: 120, textAlign: 'right' }}>最后回复</span>
            </div>
            {items.map((topic) => (
              <Link
                key={topic.id}
                to={getDetailHref('topic', topic.id)}
                className="flex items-center gap-4"
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  transition: 'background-color 0.16s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* 话题信息 */}
                <div className="flex items-start gap-3 min-w-0" style={{ flex: 1 }}>
                  <Avatar author={topic.author} size={32} />
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-medium truncate"
                      style={{ color: 'var(--foreground)', fontSize: 14 }}
                      title={topic.title}
                    >
                      {topic.title}
                    </div>
                    <div
                      className="flex items-center gap-2 mt-1"
                      style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                    >
                      <span>{topic.author?.username || '匿名'}</span>
                      <span>·</span>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent-blue-soft)',
                          color: 'var(--accent-blue)',
                          fontSize: 11,
                        }}
                      >
                        {getCategoryLabel(topic.category)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* 回复数 */}
                <div
                  style={{
                    width: 100,
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  <Reply size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {formatNumber(topic.replies_count)}
                </div>
                {/* 查看数 */}
                <div
                  style={{
                    width: 100,
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  <Eye size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {formatNumber(topic.views_count)}
                </div>
                {/* 最后回复时间 */}
                <div
                  style={{
                    width: 120,
                    textAlign: 'right',
                    fontSize: 12,
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {formatRelativeTime(topic.last_reply_at || topic.created_at)}
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </>
      )}
    </PageContainer>
  );
}
