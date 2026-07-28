import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Search, SlidersHorizontal, ArrowRight, SearchX } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  RESOURCE_TYPES,
  getTypeMeta,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  ResourceCard,
  type Resource,
  type ResourceListResponse,
} from './shared';

interface CategoryCardProps {
  type: string;
  count?: number;
  large?: boolean;
}

function CategoryCard({ type, count, large }: CategoryCardProps) {
  const meta = getTypeMeta(type);
  const Icon = meta.icon;
  const href = `/resources/list?type=${encodeURIComponent(type)}`;
  return (
    <Link
      to={href}
      className="bento-card flex flex-col gap-3 transition-shadow"
      style={{
        gridColumn: large ? 'span 6' : 'span 3',
        gridRow: large ? 'span 2' : undefined,
        padding: large ? 28 : 22,
        textDecoration: 'none',
      }}
    >
      <div className="flex items-start justify-between">
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: large ? 56 : 44,
            height: large ? 56 : 44,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-blue-soft)',
            color: 'var(--accent-blue)',
          }}
        >
          <Icon size={large ? 28 : 22} />
        </span>
        <span style={{ color: 'var(--muted-foreground)' }}>
          <ArrowRight size={16} />
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: large ? 24 : 18,
          color: 'var(--foreground)',
          letterSpacing: 'var(--tracking-tight)',
        }}
      >
        {meta.label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--muted-foreground)',
          lineHeight: 1.5,
        }}
      >
        {meta.desc}
      </div>
      {count !== undefined && (
        <div
          className="inline-flex items-center gap-1.5 mt-auto"
          style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
        >
          <Icon size={12} />
          <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
            {count.toLocaleString('zh-CN')}
          </span>
          <span>个资源</span>
        </div>
      )}
    </Link>
  );
}

interface ResourceSectionProps {
  title: string;
  sort: 'popular' | 'newest';
}

function ResourceSection({ title, sort }: ResourceSectionProps) {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ResourceListResponse>(
          `/resources/list.php?sort=${sort}&size=8`
        );
        if (!cancelled) setItems(res.items ?? []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载资源失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort]);

  return (
    <section style={{ marginTop: 48 }}>
      <div className="flex items-center justify-between mb-5">
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 24,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          {title}
        </h2>
        <Link
          to={`/resources/list?sort=${sort}`}
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: 'var(--accent-blue)' }}
        >
          查看全部
          <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX size={32} />}
          title="暂无资源"
          desc="还没有资源被收录，快来上传第一个吧"
        />
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {items.map((item) => (
            <ResourceCard key={item.id} resource={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function IndexPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  // 加载各分类资源数量（用于卡片显示）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<ResourceListResponse>(
          `/resources/list.php?size=1`
        );
        if (cancelled) return;
        // 仅设置总数量，分类数量由后端单独提供时再补充
        setCounts((prev) => ({ ...prev, total: res.total ?? 0 }));
      } catch {
        // 静默失败，分类计数非关键
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (q) {
        navigate(`/resources/list?q=${encodeURIComponent(q)}`);
      } else {
        navigate('/resources/list');
      }
    },
    [query, navigate]
  );

  return (
    <PageContainer>
      {/* 标题区 + 上传按钮 */}
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
            <span>Resources</span>
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
            资源中心
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted-foreground)', margin: 0 }}>
            发现、下载和分享 Minecraft iOS 资源
          </p>
        </div>
        <Link to="/resources/upload" className="btn-blue btn-lg">
          <Upload size={18} />
          上传资源
        </Link>
      </section>

      {/* 搜索栏 */}
      <form
        onSubmit={onSearch}
        className="flex gap-3 items-center flex-wrap"
        style={{ marginBottom: 32 }}
      >
        <div
          className="relative flex-1"
          style={{ minWidth: 280 }}
        >
          <span
            className="absolute"
            style={{
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted-foreground)',
              pointerEvents: 'none',
            }}
          >
            <Search size={18} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索资源、Mod、整合包..."
            className="w-full"
            style={{
              padding: '14px 16px 14px 44px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--foreground)',
              fontSize: 15,
              outline: 'none',
              transition: 'border-color 0.16s ease',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <Link to="/resources/list" className="btn-outline">
          <SlidersHorizontal size={16} />
          高级筛选
        </Link>
        <button type="submit" className="btn-blue">
          <Search size={16} />
          搜索
        </button>
      </form>

      {/* 资源分类导航 - Bento Grid */}
      <section className="bento-grid">
        <CategoryCard type="modpack" large count={counts.modpack} />
        <CategoryCard type="mod" count={counts.mod} />
        <CategoryCard type="shader" count={counts.shader} />
        <CategoryCard type="renderer" count={counts.renderer} />
        <CategoryCard type="software" count={counts.software} />
        <CategoryCard type="other" count={counts.other} />
      </section>

      {/* 热门资源 */}
      <ResourceSection title="热门资源" sort="popular" />

      {/* 最新资源 */}
      <ResourceSection title="最新资源" sort="newest" />

      {/* 资源类型说明 */}
      <section
        className="mt-16 grid gap-4"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
      >
        {RESOURCE_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="bento-card flex items-start gap-3"
              style={{ gridColumn: 'span 1', padding: 20 }}
            >
              <span
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-blue-soft)',
                  color: 'var(--accent-blue)',
                }}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <div
                  className="font-semibold"
                  style={{ color: 'var(--foreground)', fontSize: 14 }}
                >
                  {t.label}
                </div>
                <div
                  className="mt-0.5"
                  style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                >
                  {t.desc}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 错误占位（已移除） */}
    </PageContainer>
  );
}
