import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  List as ListIcon,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SearchX,
  ArrowRight,
  Download,
  Star,
  User,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  RESOURCE_TYPES,
  getTypeMeta,
  getTagBadgeClass,
  getSourceMeta,
  formatNumber,
  formatRelativeTime,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  Breadcrumb,
  type Resource,
  type ResourceListResponse,
} from './shared';

type SortKey = 'newest' | 'popular' | 'downloads' | 'relevance';
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'relevance', label: '相关度' },
  { key: 'newest', label: '最新更新' },
  { key: 'popular', label: '最多下载' },
  { key: 'downloads', label: '最高评分' },
];

// iOS 适配标签
const IOS_TAGS = ['iOS移植', '修改版', '触屏适配', 'AirPack', 'TrollStore'];
// 加载器
const LOADER_TAGS = ['Fabric', 'Forge', 'NeoForge', 'Quilt', 'LiteLoader'];
// 游戏版本
const GAME_VERSIONS = ['1.20.1', '1.20.4', '1.20.6', '1.21', '1.21.1', '26.1', '26.2', '1.19.2', '1.18.2', '1.16.5', '1.12.2'];
// 环境
const ENVIRONMENTS = ['客户端', '服务端'];

interface FilterState {
  types: string[];
  tags: string[];
  loaders: string[];
  gameVersions: string[];
  environments: string[];
  sources: string[];
}

function parseArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 从 URL 读取初始状态
  const initialType = searchParams.get('type') || '';
  const initialQ = searchParams.get('q') || '';
  const initialSort = (searchParams.get('sort') as SortKey) || 'relevance';
  const initialPage = parseInt(searchParams.get('page') || '1', 10) || 1;
  const initialView = (searchParams.get('view') as 'grid' | 'list') || 'grid';

  const [query, setQuery] = useState(initialQ);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [view, setView] = useState<'grid' | 'list'>(initialView);
  const [filters, setFilters] = useState<FilterState>({
    types: initialType ? [initialType] : parseArrayParam(searchParams.get('types')),
    tags: parseArrayParam(searchParams.get('tags')),
    loaders: parseArrayParam(searchParams.get('loaders')),
    gameVersions: parseArrayParam(searchParams.get('game_versions')),
    environments: parseArrayParam(searchParams.get('env')),
    sources: parseArrayParam(searchParams.get('sources')),
  });

  const [items, setItems] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inResultQuery, setInResultQuery] = useState('');

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 同步 URL 参数
  const syncUrl = useCallback(
    (next: { q: string; sort: SortKey; page: number; view: 'grid' | 'list'; filters: FilterState }) => {
      const params: Record<string, string> = {};
      if (next.q) params.q = next.q;
      if (next.sort && next.sort !== 'relevance') params.sort = next.sort;
      if (next.page > 1) params.page = String(next.page);
      if (next.view !== 'grid') params.view = next.view;
      if (next.filters.types.length === 1) params.type = next.filters.types[0];
      else if (next.filters.types.length > 1) params.types = next.filters.types.join(',');
      if (next.filters.tags.length) params.tags = next.filters.tags.join(',');
      if (next.filters.loaders.length) params.loaders = next.filters.loaders.join(',');
      if (next.filters.gameVersions.length) params.game_versions = next.filters.gameVersions.join(',');
      if (next.filters.environments.length) params.env = next.filters.environments.join(',');
      if (next.filters.sources.length) params.sources = next.filters.sources.join(',');
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  // 加载数据
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (inResultQuery.trim()) params.set('q', inResultQuery.trim());
        params.set('sort', sort);
        params.set('page', String(page));
        params.set('size', String(pageSize));
        if (filters.types.length === 1) params.set('type', filters.types[0]);
        if (filters.types.length > 1) params.set('types', filters.types.join(','));
        if (filters.tags.length) {
          params.set('tag_type', 'ios');
          params.set('tag_value', filters.tags.join(','));
        }
        if (filters.loaders.length) {
          params.set('loader', filters.loaders.join(','));
        }
        if (filters.gameVersions.length) {
          params.set('game_version', filters.gameVersions.join(','));
        }
        if (filters.environments.length) {
          params.set('env', filters.environments.join(','));
        }
        if (filters.sources.length) {
          params.set('source', filters.sources.join(','));
        }
        const res = await api.get<ResourceListResponse>(
          `/resources/list.php?${params.toString()}`
        );
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载资源列表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, inResultQuery, sort, page, filters]);

  // 同步 URL（每次状态变化）
  useEffect(() => {
    syncUrl({ q: query, sort, page, view, filters });
  }, [query, sort, page, view, filters, syncUrl]);

  const toggleFilter = useCallback(
    (key: keyof FilterState, value: string) => {
      setFilters((prev) => {
        const arr = prev[key];
        const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
        return { ...prev, [key]: next };
      });
      setPage(1);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({
      types: [],
      tags: [],
      loaders: [],
      gameVersions: [],
      environments: [],
      sources: [],
    });
    setQuery('');
    setInResultQuery('');
    setSort('relevance');
    setPage(1);
  }, []);

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
    },
    []
  );

  const onPageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 分页器页码列表
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

  const activeType = filters.types[0];
  const headerMeta = getTypeMeta(activeType);
  const breadcrumbItems = [
    { label: '资源中心', href: '/resources' },
    { label: activeType ? headerMeta.label : '全部资源' },
  ];

  return (
    <PageContainer>
      <Breadcrumb items={breadcrumbItems} />

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
            <span>Resources {activeType ? `/ ${headerMeta.label}` : ''}</span>
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
            {activeType ? headerMeta.label : '全部资源'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0 }}>
            {activeType ? headerMeta.desc : '发现最好的 Minecraft iOS 资源'}
          </p>
        </div>
        <Link to="/resources/upload" className="btn-blue">
          <Upload size={16} />
          上传资源
        </Link>
      </section>

      {/* 两栏布局 */}
      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: '280px 1fr', alignItems: 'flex-start' }}
      >
        {/* 左侧筛选栏 */}
        <aside
          className="flex flex-col gap-6"
          style={{
            position: 'sticky',
            top: 88,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* 结果内搜索 */}
          <form onSubmit={onSearchSubmit} className="relative">
            <span
              className="absolute"
              style={{
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted-foreground)',
                pointerEvents: 'none',
              }}
            >
              <Search size={16} />
            </span>
            <input
              type="text"
              value={inResultQuery}
              onChange={(e) => setInResultQuery(e.target.value)}
              placeholder="在结果中搜索..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: 13,
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </form>

          {/* 分类 */}
          <FilterGroup title="分类">
            <div className="flex flex-col gap-1">
              <FilterCatItem
                label="全部"
                active={filters.types.length === 0}
                onClick={() => {
                  setFilters((p) => ({ ...p, types: [] }));
                  setPage(1);
                }}
              />
              {RESOURCE_TYPES.map((t) => (
                <FilterCatItem
                  key={t.key}
                  label={t.label}
                  active={filters.types.includes(t.key)}
                  onClick={() => toggleFilter('types', t.key)}
                />
              ))}
            </div>
          </FilterGroup>

          {/* iOS 适配标签 */}
          <FilterGroup title="iOS 适配标签">
            <div className="flex flex-wrap gap-1.5">
              {IOS_TAGS.map((tag) => (
                <TagButton
                  key={tag}
                  label={tag}
                  active={filters.tags.includes(tag)}
                  onClick={() => toggleFilter('tags', tag)}
                />
              ))}
            </div>
          </FilterGroup>

          {/* 加载器 */}
          <FilterGroup title="加载器">
            <div className="flex flex-col gap-2">
              {LOADER_TAGS.map((loader) => (
                <FilterCheck
                  key={loader}
                  label={loader}
                  checked={filters.loaders.includes(loader)}
                  onChange={() => toggleFilter('loaders', loader)}
                />
              ))}
            </div>
          </FilterGroup>

          {/* 游戏版本 */}
          <FilterGroup title="MC 版本">
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {GAME_VERSIONS.map((v) => (
                <FilterCheck
                  key={v}
                  label={v}
                  checked={filters.gameVersions.includes(v)}
                  onChange={() => toggleFilter('gameVersions', v)}
                />
              ))}
            </div>
          </FilterGroup>

          {/* 环境 */}
          <FilterGroup title="环境">
            <div className="flex flex-col gap-2">
              {ENVIRONMENTS.map((env) => (
                <FilterCheck
                  key={env}
                  label={env}
                  checked={filters.environments.includes(env)}
                  onChange={() => toggleFilter('environments', env)}
                />
              ))}
            </div>
          </FilterGroup>

          {/* 排序 */}
          <FilterGroup title="排序">
            <div className="flex flex-col gap-1">
              {SORT_OPTIONS.map((opt) => (
                <SortItem
                  key={opt.key}
                  label={opt.label}
                  active={sort === opt.key}
                  onClick={() => {
                    setSort(opt.key);
                    setPage(1);
                  }}
                />
              ))}
            </div>
          </FilterGroup>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 py-2 text-sm"
            style={{
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted-foreground)',
              transition: 'all 0.16s ease',
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
            <RotateCcw size={14} />
            重置筛选
          </button>
        </aside>

        {/* 右侧资源列表 */}
        <div className="flex flex-col gap-4">
          {/* 工具栏 */}
          <div
            className="flex items-center justify-between gap-3 flex-wrap"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--card)',
            }}
          >
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              共 <strong style={{ color: 'var(--foreground)' }}>{total.toLocaleString('zh-CN')}</strong> 个结果
            </div>
            <div className="flex items-center gap-1">
              <ViewButton
                active={view === 'list'}
                onClick={() => setView('list')}
                title="列表视图"
              >
                <ListIcon size={16} />
              </ViewButton>
              <ViewButton
                active={view === 'grid'}
                onClick={() => setView('grid')}
                title="网格视图"
              >
                <LayoutGrid size={16} />
              </ViewButton>
            </div>
          </div>

          {/* 内容 */}
          {loading ? (
            <LoadingBlock />
          ) : error ? (
            <ErrorBlock message={error} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<SearchX size={36} />}
              title="没有找到匹配的资源"
              desc="试试调整筛选条件或上传新资源"
              action={
                <Link to="/resources/upload" className="btn-blue btn-sm">
                  <Upload size={14} />
                  上传资源
                </Link>
              }
            />
          ) : view === 'grid' ? (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
            >
              {items.map((item) => (
                <GridCard key={item.id} resource={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <ListRow key={item.id} resource={item} />
              ))}
            </div>
          )}

          {/* 分页器 */}
          {!loading && !error && items.length > 0 && totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-2 flex-wrap mt-6"
              aria-label="分页"
            >
              <PageButton
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                title="上一页"
              >
                <ChevronLeft size={16} />
              </PageButton>
              {pageNumbers.map((p, idx) =>
                p === '...' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{
                      padding: '0 8px',
                      color: 'var(--muted-foreground)',
                      fontSize: 14,
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <PageButton
                    key={p}
                    active={p === page}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </PageButton>
                )
              )}
              <PageButton
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                title="下一页"
              >
                <ChevronRight size={16} />
              </PageButton>
            </nav>
          )}
        </div>
      </div>

    </PageContainer>
  );
}

/* ============ 子组件 ============ */

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--muted-foreground)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function FilterCatItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors"
      style={{
        background: active ? 'var(--accent-blue-soft)' : 'transparent',
        color: active ? 'var(--accent-blue)' : 'var(--foreground)',
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--muted)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>{label}</span>
    </button>
  );
}

function TagButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`badge ${active ? 'tag-active' : 'badge-outline'}`}
      style={{
        cursor: 'pointer',
        border: '1px solid var(--border-strong)',
        padding: '4px 10px',
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );
}

function FilterCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer text-sm"
      style={{ color: 'var(--foreground)' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: 16,
          height: 16,
          accentColor: 'var(--accent-blue)',
        }}
      />
      <span>{label}</span>
    </label>
  );
}

function SortItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1.5 text-sm rounded text-left transition-colors"
      style={{
        background: active ? 'var(--accent-blue-soft)' : 'transparent',
        color: active ? 'var(--accent-blue)' : 'var(--foreground)',
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--muted)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 rounded transition-colors"
      style={{
        background: active ? 'var(--accent-blue-soft)' : 'transparent',
        color: active ? 'var(--accent-blue)' : 'var(--muted-foreground)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--muted)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function PageButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="min-w-[36px] h-9 px-2 rounded text-sm transition-colors"
      style={{
        background: active ? 'var(--accent-blue)' : 'transparent',
        color: active ? 'var(--accent-blue-foreground)' : 'var(--foreground)',
        border: `1px solid ${active ? 'var(--accent-blue)' : 'var(--border)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = 'var(--muted)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function GridCard({ resource }: { resource: Resource }) {
  const meta = getTypeMeta(resource.type);
  const Icon = meta.icon;
  const slug = resource.slug || resource.id;
  const detailHref = `/resources/detail?slug=${encodeURIComponent(String(slug))}`;
  const tags = (resource.tags ?? []).slice(0, 3);
  const downloads = resource.downloads ?? resource.download_count ?? 0;
  const rating = resource.rating ?? resource.rating_average ?? 0;
  const author = resource.author || resource.author_username || '匿名';
  const cover = resource.cover_url || resource.thumbnail_url || resource.icon_url;

  return (
    <Link
      to={detailHref}
      className="flex flex-col overflow-hidden rounded-lg transition-shadow"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          aspectRatio: '16 / 9',
          background: cover ? undefined : 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
          color: 'var(--accent-blue)',
        }}
      >
        {cover ? (
          <img src={cover} alt={resource.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <Icon size={48} strokeWidth={1.5} />
        )}
        <span className="absolute top-2 left-2 badge badge-soft" style={{ fontSize: 11 }}>
          {meta.label}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div
          className="font-semibold truncate"
          style={{ color: 'var(--foreground)', fontSize: 15 }}
          title={resource.name}
        >
          {resource.name}
        </div>
        <div className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <User size={12} />
          <span>by {author}</span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((tag) => (
              <span key={tag} className={`badge ${getTagBadgeClass(tag)}`} style={{ fontSize: 10 }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span className="inline-flex items-center gap-1">
            <Download size={12} />
            {formatNumber(downloads)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={12} style={{ color: 'var(--color-star)' }} />
            {rating > 0 ? rating.toFixed(1) : '-'}
          </span>
          {resource.updated_at && (
            <span>{formatRelativeTime(resource.updated_at)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ListRow({ resource }: { resource: Resource }) {
  const meta = getTypeMeta(resource.type);
  const Icon = meta.icon;
  const slug = resource.slug || resource.id;
  const detailHref = `/resources/detail?slug=${encodeURIComponent(String(slug))}`;
  const tags = resource.tags ?? [];
  const downloads = resource.downloads ?? resource.download_count ?? 0;
  const rating = resource.rating ?? resource.rating_average ?? 0;
  const author = resource.author || resource.author_username || '匿名';
  const cover = resource.cover_url || resource.thumbnail_url || resource.icon_url;
  const sourceMeta = getSourceMeta(resource.source || (resource.sources && resource.sources[0]));

  return (
    <Link
      to={detailHref}
      className="flex gap-4 p-4 rounded-lg transition-shadow"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-sm)',
          background: cover ? undefined : 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
          color: 'var(--accent-blue)',
          overflow: 'hidden',
        }}
      >
        {cover ? (
          <img src={cover} alt={resource.name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <Icon size={28} strokeWidth={1.5} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold truncate"
          style={{ color: 'var(--foreground)', fontSize: 15 }}
        >
          {resource.name}
        </div>
        <div className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          <User size={12} />
          <span>by {author}</span>
        </div>
        {resource.summary && (
          <div
            className="mt-1.5 text-sm line-clamp-2"
            style={{ color: 'var(--muted-foreground)', lineHeight: 1.5 }}
          >
            {resource.summary}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className={`badge ${getTagBadgeClass(tag)}`} style={{ fontSize: 10 }}>
              {tag}
            </span>
          ))}
          {sourceMeta && (
            <span className={`source-label ${sourceMeta.badgeClass}`} style={{ fontSize: 10 }}>
              {sourceMeta.label}
            </span>
          )}
        </div>
      </div>
      <div
        className="flex flex-col gap-2 items-end justify-between flex-shrink-0"
        style={{ minWidth: 120 }}
      >
        <div className="flex flex-col gap-1 text-xs items-end" style={{ color: 'var(--muted-foreground)' }}>
          <span className="inline-flex items-center gap-1">
            <Download size={12} />
            {formatNumber(downloads)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={12} style={{ color: 'var(--color-star)' }} />
            {rating > 0 ? rating.toFixed(1) : '-'}
          </span>
          {resource.updated_at && (
            <span>{formatRelativeTime(resource.updated_at)}</span>
          )}
        </div>
        <span
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--accent-blue)' }}
        >
          查看详情
          <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
