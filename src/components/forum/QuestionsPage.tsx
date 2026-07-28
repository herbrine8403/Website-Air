import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, HelpCircle, Eye, MessageSquare, CheckCircle, Coins, ChevronDown } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  QUESTION_STATUS_OPTIONS,
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
  type Question,
  type QuestionListResponse,
} from './shared';

export default function QuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const syncUrl = useCallback(
    (next: { status: string; page: number }) => {
      const params: Record<string, string> = {};
      if (next.status) params.status = next.status;
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
        if (status) params.set('status', status);
        params.set('page', String(page));
        params.set('size', String(pageSize));
        const res = await api.get<QuestionListResponse>(`/forum/questions.php?${params.toString()}`);
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载问题列表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  const handleStatusChange = (key: string) => {
    setStatus(key);
    setPage(1);
    syncUrl({ status: key, page: 1 });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    syncUrl({ status, page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageContainer>
      <Breadcrumb
        items={[{ label: '论坛', href: '/forum' }, { label: '问答区' }]}
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
                background: 'var(--color-success)',
              }}
            />
            <span>Forum / Questions</span>
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
            问答区
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0 }}>
            提问与解答
          </p>
        </div>
        <Link to="/forum/new-post?type=question" className="btn-blue">
          <Plus size={16} />
          提问
        </Link>
      </section>

      {/* 状态筛选 tabs */}
      <div
        className="flex items-center gap-1 flex-wrap"
        style={{ marginBottom: 24 }}
      >
        {QUESTION_STATUS_OPTIONS.map((tab) => {
          const active = status === tab.key;
          return (
            <button
              key={tab.key || 'all'}
              onClick={() => handleStatusChange(tab.key)}
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

      {/* 问题列表 */}
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HelpCircle size={32} />}
          title="暂无问题"
          desc="还没有人提问，快来提出第一个问题吧"
          action={
            <Link to="/forum/new-post?type=question" className="btn-blue">
              <Plus size={16} />
              提问
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
            {items.map((question) => (
              <Link
                key={question.id}
                to={getDetailHref('question', question.id)}
                className="flex items-center gap-4"
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  transition: 'background-color 0.16s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* 统计区 */}
                <div
                  className="flex flex-col items-center justify-center flex-shrink-0"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-sm)',
                    background: question.is_solved
                      ? 'var(--color-success-soft, rgba(22, 163, 74, 0.1))'
                      : 'var(--muted)',
                    color: question.is_solved ? 'var(--color-success)' : 'var(--muted-foreground)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    {formatNumber(question.answers_count)}
                  </span>
                  <span style={{ fontSize: 10, marginTop: 2 }}>回答</span>
                </div>

                {/* 问题信息 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {question.is_solved && (
                      <span
                        className="inline-flex items-center gap-1"
                        style={{
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-success-soft, rgba(22, 163, 74, 0.1))',
                          color: 'var(--color-success)',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle size={10} />
                        已解决
                      </span>
                    )}
                    {question.bounty != null && question.bounty > 0 && (
                      <span
                        className="inline-flex items-center gap-1"
                        style={{
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-warning-soft, rgba(234, 88, 12, 0.1))',
                          color: 'var(--color-warning)',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <Coins size={10} />
                        {question.bounty}
                      </span>
                    )}
                    <span
                      className="font-medium truncate"
                      style={{ color: 'var(--foreground)', fontSize: 14 }}
                      title={question.title}
                    >
                      {question.title}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 mt-1"
                    style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                  >
                    <Avatar author={question.author} size={16} />
                    <span>{question.author?.username || '匿名'}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(question.created_at)}</span>
                  </div>
                </div>

                {/* 查看数 */}
                <div
                  className="flex items-center gap-1 flex-shrink-0"
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <Eye size={12} />
                  {formatNumber(question.views_count)}
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
