import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  Download,
  Clock,
  Upload as UploadIcon,
  Edit,
  RotateCcw,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  getTypeMeta,
  formatNumber,
  formatRelativeTime,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  type Resource,
  type ResourceListResponse,
} from './shared';

type StatusKey = 'published' | 'pending' | 'draft' | 'removed';

interface TabMeta {
  key: StatusKey;
  label: string;
}

const STATUS_TABS: TabMeta[] = [
  { key: 'published', label: '已发布' },
  { key: 'pending', label: '待审核' },
  { key: 'draft', label: '草稿' },
  { key: 'removed', label: '已下架' },
];

interface StatsResponse {
  success: boolean;
  stats?: {
    total_resources?: number;
    total_downloads?: number;
    pending?: number;
    published?: number;
    draft?: number;
    removed?: number;
  };
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}

const PAGE_SIZE = 10;

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('status') as StatusKey) || 'published';
  const currentPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  const [items, setItems] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total_resources: number;
    total_downloads: number;
    pending: number;
    published: number;
    draft: number;
    removed: number;
  }>({
    total_resources: 0,
    total_downloads: 0,
    pending: 0,
    published: 0,
    draft: 0,
    removed: 0,
  });

  // 删除确认状态
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 加载列表
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('mine', '1');
      params.set('status', activeTab);
      params.set('page', String(currentPage));
      params.set('size', String(PAGE_SIZE));
      const res = await api.get<ResourceListResponse>(
        `/resources/list.php?${params.toString()}`
      );
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('加载资源列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage]);

  // 加载统计
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<StatsResponse>('/account/dashboard.php');
      if (res.stats) {
        setStats({
          total_resources: res.stats.total_resources ?? 0,
          total_downloads: res.stats.total_downloads ?? 0,
          pending: res.stats.pending ?? 0,
          published: res.stats.published ?? 0,
          draft: res.stats.draft ?? 0,
          removed: res.stats.removed ?? 0,
        });
      }
    } catch {
      // 静默失败，统计为 0
    }
  }, []);

  useEffect(() => {
    fetchList();
    fetchStats();
  }, [fetchList, fetchStats]);

  // 切换 Tab
  const switchTab = useCallback(
    (key: StatusKey) => {
      const params: Record<string, string> = { status: key };
      if (currentPage !== 1) params.page = '1';
      setSearchParams(params, { replace: true });
    },
    [currentPage, setSearchParams]
  );

  // 切换页码
  const onPageChange = useCallback(
    (newPage: number) => {
      const params: Record<string, string> = { status: activeTab };
      if (newPage > 1) params.page = String(newPage);
      setSearchParams(params, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeTab, setSearchParams]
  );

  // 确认删除
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const targetSlug = pendingDelete.slug || String(pendingDelete.id);
      await api.delete<DeleteResponse>(`/resources/delete.php?slug=${encodeURIComponent(targetSlug)}`);
      setPendingDelete(null);
      // 重新加载
      fetchList();
      fetchStats();
    } catch (err) {
      if (err instanceof ApiError) setDeleteError(err.message);
      else setDeleteError('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, fetchList, fetchStats]);

  // 当前 Tab 计数
  const tabCounts = useMemo<Record<StatusKey, number>>(
    () => ({
      published: stats.published,
      pending: stats.pending,
      draft: stats.draft,
      removed: stats.removed,
    }),
    [stats]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 分页器页码列表
  const pageNumbers = useMemo<Array<number | '...'>>(() => {
    const result: Array<number | '...'> = [];
    const max = totalPages;
    const cur = currentPage;
    if (max <= 7) {
      for (let i = 1; i <= max; i++) result.push(i);
      return result;
    }
    result.push(1);
    if (cur > 3) result.push('...');
    const start = Math.max(2, cur - 1);
    const end = Math.min(max - 1, cur + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (cur < max - 2) result.push('...');
    result.push(max);
    return result;
  }, [currentPage, totalPages]);

  return (
    <PageContainer>
      {/* 页面头部 */}
      <section
        className="flex items-end justify-between gap-6 flex-wrap"
        style={{ paddingTop: 40, paddingBottom: 28 }}
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
            <span>Dashboard / Resources</span>
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
            资源管理
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted-foreground)', margin: 0 }}>
            管理你上传的资源
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link to="/resources/upload" className="btn-blue">
            <UploadIcon size={18} />
            上传资源
          </Link>
        </div>
      </section>

      {/* 统计概览 */}
      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}
      >
        <StatCard
          icon={<Package size={22} />}
          iconTone="blue"
          label="总资源数"
          value={formatNumber(stats.total_resources)}
          unit="个"
        />
        <StatCard
          icon={<Download size={22} />}
          iconTone="green"
          label="总下载量"
          value={formatNumber(stats.total_downloads)}
          unit="次"
        />
        <StatCard
          icon={<Clock size={22} />}
          iconTone="orange"
          label="待审核"
          value={String(stats.pending)}
          unit="个"
        />
      </section>

      {/* Tab 导航 */}
      <nav
        className="flex items-center gap-1 overflow-x-auto"
        style={{
          borderBottom: '1px solid var(--border)',
          marginBottom: 20,
        }}
        aria-label="资源状态筛选"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className="inline-flex items-center gap-2 whitespace-nowrap"
              style={{
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--accent-blue)' : 'var(--muted-foreground)',
                borderBottom: `2px solid ${isActive ? 'var(--accent-blue)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'color 0.16s ease, border-color 0.16s ease',
                background: 'none',
                border: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: isActive ? 'var(--accent-blue-soft)' : 'var(--muted)',
                  color: isActive ? 'var(--accent-blue)' : 'var(--muted-foreground)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 内容区 */}
      {loading ? (
        <LoadingBlock label="加载资源中..." />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package size={36} />}
          title="暂无资源"
          desc={
            activeTab === 'published'
              ? '你还没有上传过资源，立即上传第一个吧'
              : `当前分类下没有资源`
          }
          action={
            <Link to="/resources/upload" className="btn-blue">
              <UploadIcon size={16} />
              立即上传
            </Link>
          }
        />
      ) : (
        <>
          {/* 资源表格 */}
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['资源', '分类', '状态', '下载量', '评分', '最后更新', '操作'].map((th) => (
                    <th
                      key={th}
                      style={{
                        padding: '14px 18px',
                        textAlign: 'left',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--muted-foreground)',
                        fontWeight: 600,
                        background: 'var(--background)',
                        borderBottom: '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {th}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const meta = getTypeMeta(r.type);
                  const Icon = meta.icon;
                  const slug = r.slug || String(r.id);
                  const detailHref = `/resources/detail?slug=${encodeURIComponent(slug)}`;
                  const uploadHref = `/resources/upload?edit=${encodeURIComponent(slug)}`;
                  const versionsHref = `/resources/versions?slug=${encodeURIComponent(slug)}`;
                  const downloads = r.downloads ?? r.download_count ?? 0;
                  const rating = r.rating ?? r.rating_average ?? 0;
                  const status = r.status || activeTab;
                  return (
                    <tr
                      key={r.id}
                      style={{ transition: 'background-color 0.16s ease' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--background)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td
                        data-label="资源"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--foreground)', verticalAlign: 'middle' }}
                      >
                        <Link
                          to={detailHref}
                          style={{ textDecoration: 'none' }}
                          className="flex items-center gap-3"
                        >
                          <span
                            className="inline-flex items-center justify-center flex-shrink-0"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 'var(--radius-sm)',
                              background: 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
                              color: 'var(--accent-blue)',
                            }}
                          >
                            <Icon size={22} strokeWidth={1.5} />
                          </span>
                          <span className="flex flex-col gap-0.5 min-w-0">
                            <span
                              className="font-semibold truncate"
                              style={{ fontSize: 14, color: 'var(--foreground)', maxWidth: 220 }}
                              title={r.name}
                            >
                              {r.name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--muted-foreground)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              #{String(r.id).padStart(3, '0')}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td
                        data-label="分类"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, verticalAlign: 'middle' }}
                      >
                        <CategoryBadge type={r.type} />
                      </td>
                      <td
                        data-label="状态"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, verticalAlign: 'middle' }}
                      >
                        <StatusBadge status={status} />
                      </td>
                      <td
                        data-label="下载量"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}
                      >
                        {downloads > 0 ? (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 13,
                              color: 'var(--foreground)',
                              fontWeight: 500,
                            }}
                          >
                            {formatNumber(downloads)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>—</span>
                        )}
                      </td>
                      <td
                        data-label="评分"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}
                      >
                        {rating > 0 ? (
                          <span
                            className="inline-flex items-center gap-1"
                            style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}
                          >
                            <Star size={14} fill="currentColor" style={{ color: 'var(--color-star)' }} />
                            {rating.toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>—</span>
                        )}
                      </td>
                      <td
                        data-label="最后更新"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--muted-foreground)',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.updated_at ? formatRelativeTime(r.updated_at) : '—'}
                        </span>
                      </td>
                      <td
                        data-label="操作"
                        className="actions-cell"
                        style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}
                      >
                        <Link
                          to={uploadHref}
                          title="编辑"
                          className="inline-flex items-center justify-center"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--muted-foreground)',
                            transition: 'color 0.16s ease, background-color 0.16s ease',
                            marginRight: 2,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--foreground)';
                            e.currentTarget.style.background = 'var(--muted)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--muted-foreground)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Edit size={16} />
                        </Link>
                        <Link
                          to={versionsHref}
                          title="版本"
                          className="inline-flex items-center justify-center"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--muted-foreground)',
                            transition: 'color 0.16s ease, background-color 0.16s ease',
                            marginRight: 2,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--foreground)';
                            e.currentTarget.style.background = 'var(--muted)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--muted-foreground)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <RotateCcw size={16} />
                        </Link>
                        <button
                          type="button"
                          title="删除"
                          onClick={() => {
                            setDeleteError(null);
                            setPendingDelete(r);
                          }}
                          className="inline-flex items-center justify-center"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--muted-foreground)',
                            transition: 'color 0.16s ease, background-color 0.16s ease',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--destructive)';
                            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--muted-foreground)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页器 */}
          <div
            className="flex items-center justify-between gap-4 flex-wrap"
            style={{ marginTop: 20 }}
          >
            <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
              共 {total} 条记录
              {items.length > 0 && (
                <>
                  ，第 {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, total)} 条
                </>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex items-center justify-center"
                style={{
                  minWidth: 36,
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  transition: 'color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease',
                }}
                aria-label="上一页"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((pn, idx) => {
                if (pn === '...') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{ color: 'var(--muted-foreground)', padding: '0 4px' }}
                    >
                      …
                    </span>
                  );
                }
                const isActive = pn === currentPage;
                return (
                  <button
                    key={pn}
                    type="button"
                    onClick={() => onPageChange(pn)}
                    className="inline-flex items-center justify-center"
                    style={{
                      minWidth: 36,
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: isActive ? 'var(--accent-blue-foreground)' : 'var(--muted-foreground)',
                      border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border)'}`,
                      background: isActive ? 'var(--accent-blue)' : 'var(--background)',
                      cursor: 'pointer',
                      transition: 'color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease',
                    }}
                  >
                    {pn}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center justify-center"
                style={{
                  minWidth: 36,
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  transition: 'color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease',
                }}
                aria-label="下一页"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 删除确认弹窗 */}
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="删除资源"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-xl)',
              maxWidth: 420,
              width: '100%',
              padding: 24,
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <span
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(220, 38, 38, 0.08)',
                  color: 'var(--destructive)',
                }}
              >
                <AlertTriangle size={20} />
              </span>
              <div className="flex-1">
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--foreground)',
                    margin: 0,
                  }}
                >
                  删除资源
                </h3>
                <p
                  className="mt-1"
                  style={{ fontSize: 14, color: 'var(--muted-foreground)', margin: 0 }}
                >
                  确定删除 <strong style={{ color: 'var(--foreground)' }}>{pendingDelete.name}</strong>
                  ？此操作不可撤销，所有版本和文件都将被永久删除。
                </p>
              </div>
            </div>

            {deleteError && (
              <div
                className="flex items-center gap-2 mb-4 p-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  color: 'var(--destructive)',
                }}
              >
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !deleting && setPendingDelete(null)}
                disabled={deleting}
                className="btn-outline"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2"
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--destructive)',
                  color: 'var(--destructive-foreground)',
                  fontWeight: 500,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  transition: 'filter 0.16s ease, transform 0.15s ease',
                }}
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

/* ============ 子组件 ============ */

function StatCard({
  icon,
  iconTone,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  iconTone: 'blue' | 'green' | 'orange';
  label: string;
  value: string;
  unit: string;
}) {
  const toneStyles =
    iconTone === 'green'
      ? { background: 'var(--color-success-soft)', color: 'var(--color-success)' }
      : iconTone === 'orange'
      ? { background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }
      : { background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)' };

  return (
    <div
      className="flex items-center gap-4"
      style={{
        padding: '20px 22px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.16s ease, border-color 0.16s ease',
      }}
    >
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-sm)',
          ...toneStyles,
        }}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          style={{
            fontSize: 13,
            color: 'var(--muted-foreground)',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            color: 'var(--foreground)',
            lineHeight: 1,
          }}
        >
          {value}
          <span
            style={{
              fontSize: 14,
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-sans)',
              marginLeft: 2,
            }}
          >
            {unit}
          </span>
        </span>
      </div>
    </div>
  );
}

function CategoryBadge({ type }: { type?: string }) {
  const meta = getTypeMeta(type);
  // 按类型选择颜色：modpack=info蓝、mod=success绿、shader=purple紫、renderer=warning橙、software/other=muted灰
  let tone: { bg: string; color: string };
  switch (type) {
    case 'modpack':
      tone = { bg: 'var(--accent-blue-soft)', color: 'var(--accent-blue)' };
      break;
    case 'mod':
      tone = { bg: 'var(--color-success-soft)', color: 'var(--color-success)' };
      break;
    case 'shader':
      tone = { bg: 'var(--color-purple-soft)', color: 'var(--color-purple)' };
      break;
    case 'renderer':
      tone = { bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' };
      break;
    default:
      tone = { bg: 'var(--muted)', color: 'var(--muted-foreground)' };
  }
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: '3px 10px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 500,
        ...tone,
      }}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  let tone: { bg: string; color: string };
  let label: string;
  switch (status) {
    case 'published':
      tone = { bg: 'var(--color-success)', color: 'var(--color-white)' };
      label = '已发布';
      break;
    case 'pending':
      tone = { bg: 'var(--color-warning)', color: 'var(--color-white)' };
      label = '待审核';
      break;
    case 'draft':
      tone = { bg: 'var(--muted)', color: 'var(--muted-foreground)' };
      label = '草稿';
      break;
    case 'removed':
      tone = { bg: 'var(--color-neutral)', color: 'var(--color-white)' };
      label = '已下架';
      break;
    default:
      tone = { bg: 'var(--muted)', color: 'var(--muted-foreground)' };
      label = status;
  }
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        ...tone,
      }}
    >
      {label}
    </span>
  );
}
