import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Eye, MessageSquare, ChevronDown } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  ARTICLE_SORT_OPTIONS,
  PageContainer,
  Breadcrumb,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  Avatar,
  Pagination,
  formatNumber,
  formatRelativeTime,
  formatDate,
  getDetailHref,
  type Article,
  type ArticleListResponse,
} from './shared';

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSort = searchParams.get('sort') || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const syncUrl = useCallback(
    (next: { sort: string; page: number }) => {
      const params: Record<string, string> = {};
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
        params.set('sort', sort);
        params.set('page', String(page));
        params.set('size', String(pageSize));
        const res = await api.get<ArticleListResponse>(`/forum/articles.php?${params.toString()}`);
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载文章列表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort, page]);

  const handleSortChange = (key: string) => {
    setSort(key);
    setPage(1);
    setSortOpen(false);
    syncUrl({ sort: key, page: 1 });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    syncUrl({ sort, page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSortLabel = ARTICLE_SORT_OPTIONS.find((s) => s.key === sort)?.label || '最新';

  return (
    <PageContainer>
      <Breadcrumb
        items={[{ label: '论坛', href: '/forum' }, { label: '文章区' }]}
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
                background: 'var(--color-purple)',
              }}
            />
            <span>Forum / Articles</span>
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
            文章区
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0 }}>
            教程、评测、分享
          </p>
        </div>
        <Link to="/forum/new-post?type=article" className="btn-blue">
          <Plus size={16} />
          写文章
        </Link>
      </section>

      {/* 排序栏 */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{ marginBottom: 24 }}
      >
        <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
          共 {formatNumber(total)} 篇文章
        </span>
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
                {ARTICLE_SORT_OPTIONS.map((opt) => (
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

      {/* 文章卡片列表 */}
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="暂无文章"
          desc="还没有人发布文章，快来写第一篇吧"
          action={
            <Link to="/forum/new-post?type=article" className="btn-blue">
              <Plus size={16} />
              写文章
            </Link>
          }
        />
      ) : (
        <>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
          >
            {items.map((article) => (
              <Link
                key={article.id}
                to={getDetailHref('article', article.id)}
                className="flex flex-col overflow-hidden transition-shadow"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-sm)',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
              >
                {/* 封面图 */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    aspectRatio: '16 / 9',
                    background: article.cover_image
                      ? undefined
                      : 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
                    color: 'var(--color-purple)',
                  }}
                >
                  {article.cover_image ? (
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <FileText size={48} strokeWidth={1.5} />
                  )}
                </div>
                {/* 主体 */}
                <div className="flex flex-col gap-2 p-4 flex-1">
                  <div
                    className="font-semibold truncate"
                    style={{ color: 'var(--foreground)', fontSize: 16 }}
                    title={article.title}
                  >
                    {article.title}
                  </div>
                  <div
                    className="line-clamp-2"
                    style={{
                      fontSize: 13,
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.5,
                    }}
                  >
                    {article.summary}
                  </div>
                  <div
                    className="flex items-center gap-2 mt-auto pt-2"
                    style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                  >
                    <Avatar author={article.author} size={20} />
                    <span>{article.author?.username || '匿名'}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(article.created_at)}</span>
                  </div>
                  <div
                    className="flex items-center gap-3"
                    style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} />
                      {formatNumber(article.views_count)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={12} />
                      {formatNumber(article.comments_count)}
                    </span>
                  </div>
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
