import { Link } from 'react-router-dom';
import {
  Package,
  Zap,
  Sun,
  Monitor,
  AppWindow,
  File as FileIcon,
  Download,
  Star,
  User,
  type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/** 资源类型映射 */
export type ResourceType = 'modpack' | 'mod' | 'shader' | 'renderer' | 'software' | 'other';

export interface TypeMeta {
  key: ResourceType;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const RESOURCE_TYPES: TypeMeta[] = [
  { key: 'modpack', label: '整合包', icon: Package, desc: '支持 .mrpack 和 .airpack 格式' },
  { key: 'mod', label: 'Mod', icon: Zap, desc: '游戏模组' },
  { key: 'shader', label: '光影包', icon: Sun, desc: '光影和着色器' },
  { key: 'renderer', label: '渲染器', icon: Monitor, desc: 'MetalANGLE、GL4ES、Mesa 等' },
  { key: 'software', label: '软件', icon: AppWindow, desc: 'IPA 和 TIPA 安装包' },
  { key: 'other', label: '其他资源', icon: FileIcon, desc: '材质包、存档、数据包等' },
];

export function getTypeMeta(type: string | undefined | null): TypeMeta {
  if (!type) return RESOURCE_TYPES[5];
  return RESOURCE_TYPES.find((t) => t.key === type) ?? RESOURCE_TYPES[5];
}

/** 资源类型 → badge 颜色 */
export function getTypeBadgeClass(type: string | undefined | null): string {
  switch (type) {
    case 'modpack':
      return 'badge-soft';
    case 'mod':
      return 'badge-soft';
    case 'shader':
      return 'badge-soft';
    case 'renderer':
      return 'badge-soft';
    case 'software':
      return 'badge-soft';
    default:
      return 'badge-soft';
  }
}

/** 标签 → badge 颜色（iOS 适配类用绿色，加载器类用 outline，其他用 soft） */
export function getTagBadgeClass(tag: string): string {
  const iosTags = ['iOS移植', '修改版', '触屏适配', 'AirPack', 'TrollStore'];
  const loaders = ['Fabric', 'Forge', 'NeoForge', 'Quilt', 'LiteLoader', 'Risugami'];
  if (iosTags.includes(tag)) return 'badge-green';
  if (loaders.includes(tag)) return 'badge-outline';
  return 'badge-muted';
}

/** 数字格式化（1.2K、3.4M） */
export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/** 相对时间格式化（X 天前） */
export function formatRelativeTime(time: string | undefined | null): string {
  if (!time) return '';
  // 后端可能已经返回 "X 小时前" 格式
  if (/[前后]$/.test(time)) return time;
  try {
    const dt = new Date(time);
    if (Number.isNaN(dt.getTime())) return time;
    return formatDistanceToNow(dt, { addSuffix: true, locale: zhCN });
  } catch {
    return time;
  }
}

/** 绝对日期格式化（2024-03-15） */
export function formatDate(time: string | undefined | null): string {
  if (!time) return '';
  try {
    const dt = new Date(time);
    if (Number.isNaN(dt.getTime())) return time;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return time;
  }
}

/** 下载源元数据 */
export interface SourceMeta {
  key: 'modrinth' | 'curseforge' | 'github' | 'air';
  label: string;
  /** CSS 自定义属性颜色名 */
  color: string;
  /** badge 类名 */
  badgeClass: string;
}

export const SOURCE_METAS: Record<string, SourceMeta> = {
  modrinth: { key: 'modrinth', label: 'Modrinth', color: 'var(--color-success)', badgeClass: 'source-modrinth' },
  curseforge: { key: 'curseforge', label: 'CurseForge', color: 'var(--color-warning)', badgeClass: 'source-curseforge' },
  github: { key: 'github', label: 'GitHub', color: 'var(--color-neutral)', badgeClass: 'source-official' },
  air: { key: 'air', label: 'Air 官网', color: 'var(--accent-blue)', badgeClass: 'source-bmclapi' },
};

export function getSourceMeta(source: string | undefined | null): SourceMeta | null {
  if (!source) return null;
  const key = source.toLowerCase();
  if (key in SOURCE_METAS) return SOURCE_METAS[key];
  // 兼容 "official" 等旧值
  if (key === 'official' || key === 'github') return SOURCE_METAS.github;
  if (key === 'bmclapi' || key === 'air' || key === 'air官网') return SOURCE_METAS.air;
  return null;
}

/** 通用资源接口 */
export interface Resource {
  id: string | number;
  name: string;
  slug?: string;
  type?: string;
  category?: string;
  author?: string;
  author_username?: string;
  description?: string;
  summary?: string;
  tags?: string[];
  cover_url?: string | null;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  downloads?: number;
  download_count?: number;
  follows?: number;
  follow_count?: number;
  rating?: number;
  rating_average?: number;
  rating_count?: number;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  status?: string;
  source?: string;
  sources?: string[];
  latest_version?: string;
}

/** 资源列表响应 */
export interface ResourceListResponse {
  success: boolean;
  items: Resource[];
  total: number;
  page?: number;
  size?: number;
  pages?: number;
}

/** 资源详情响应 */
export interface ResourceDetailResponse {
  success: boolean;
  resource: Resource & {
    description?: string;
    gallery?: string[];
    loaders?: string[];
    game_versions?: string[];
    file_formats?: string[];
    license?: string;
    file_size?: string;
    dependencies?: Array<{
      name: string;
      version?: string;
      type?: string;
    }>;
    versions?: VersionItem[];
  };
}

/** 版本项 */
export interface VersionItem {
  id: string | number;
  resource_id?: string | number;
  version_number?: string;
  version?: string;
  name?: string;
  type?: string; // release / beta / alpha
  version_type?: string;
  loaders?: string[];
  game_versions?: string[];
  changelog?: string;
  file_size?: string;
  size?: string;
  downloads?: number;
  download_count?: number;
  created_at?: string;
  published_at?: string;
  updated_at?: string;
  sources?: Array<{
    source: string;
    url?: string;
    filename?: string;
    size?: string;
    sha256?: string;
  }>;
  dependencies?: Array<{
    name: string;
    version?: string;
    type?: string;
  }>;
  is_latest?: boolean;
}

export interface VersionsResponse {
  success: boolean;
  resource?: { id: string | number; name: string; slug?: string; type?: string };
  versions?: VersionItem[];
  total?: number;
}

export interface VersionDetailResponse {
  success: boolean;
  version?: VersionItem;
  resource?: { id: string | number; name: string; slug?: string; type?: string };
}

/** 资源卡片组件（用于网格/列表展示） */
export interface ResourceCardProps {
  resource: Resource;
  variant?: 'grid' | 'compact';
}

export function ResourceCard({ resource, variant = 'grid' }: ResourceCardProps) {
  const meta = getTypeMeta(resource.type);
  const Icon = meta.icon;
  const slug = resource.slug || resource.id;
  const tags = (resource.tags ?? []).slice(0, 3);
  const downloads = resource.downloads ?? resource.download_count ?? 0;
  const rating = resource.rating ?? resource.rating_average ?? 0;
  const author = resource.author || resource.author_username || '匿名';
  const cover = resource.cover_url || resource.thumbnail_url || resource.icon_url;
  const detailHref = `/resources/detail?slug=${encodeURIComponent(String(slug))}`;

  if (variant === 'compact') {
    return (
      <Link
        to={detailHref}
        className="flex gap-3 items-center p-3 rounded-lg transition-colors"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
            color: 'var(--accent-blue)',
          }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="font-semibold truncate"
            style={{ color: 'var(--foreground)', fontSize: 13 }}
          >
            {resource.name}
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
            {formatNumber(downloads)} 下载 · {rating > 0 ? `${rating.toFixed(1)} 星` : '暂无评分'}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={detailHref}
      className="flex flex-col overflow-hidden rounded-lg transition-shadow"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* 缩略图 */}
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
        <span
          className="absolute top-2 left-2 badge badge-soft"
          style={{ fontSize: 11 }}
        >
          {meta.label}
        </span>
      </div>

      {/* 主体 */}
      <div className="flex flex-col gap-2 p-4">
        <div
          className="font-semibold truncate"
          style={{ color: 'var(--foreground)', fontSize: 15 }}
          title={resource.name}
        >
          {resource.name}
        </div>
        <div
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: 'var(--muted-foreground)' }}
        >
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
        <div
          className="flex items-center gap-3 mt-2 text-xs"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <span className="inline-flex items-center gap-1">
            <Download size={12} />
            {formatNumber(downloads)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={12} style={{ color: 'var(--color-star)' }} />
            {rating > 0 ? rating.toFixed(1) : '-'}
          </span>
          {resource.updated_at && (
            <span className="inline-flex items-center gap-1">
              {formatRelativeTime(resource.updated_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 加载占位组件 */
export function LoadingBlock({ label = '加载中...' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center py-12"
      style={{ color: 'var(--muted-foreground)' }}
    >
      <span className="inline-block animate-spin mr-2" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** 错误提示组件 */
export function ErrorBlock({ message }: { message: string }) {
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  );
}

/** 空状态组件 */
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="icon">{icon}</div>}
      <div className="title">{title}</div>
      {desc && <div className="desc">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** 页面标题区组件 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <section
      className="flex items-end justify-between gap-4 flex-wrap"
      style={{ paddingTop: 48, paddingBottom: 32 }}
    >
      <div className="flex flex-col gap-3">
        {eyebrow && (
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
            <span>{eyebrow}</span>
          </div>
        )}
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
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 16, color: 'var(--muted-foreground)', margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {right && <div className="flex gap-2 flex-wrap">{right}</div>}
    </section>
  );
}

/** 面包屑组件 */
export function Breadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav
      className="flex items-center gap-2 flex-wrap"
      style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 24 }}
      aria-label="面包屑"
    >
      {items.map((item, idx) => (
        <span key={idx} className="inline-flex items-center gap-2">
          {item.href ? (
            <Link
              to={item.href}
              style={{ color: 'var(--muted-foreground)', transition: 'color 0.16s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{item.label}</span>
          )}
          {idx < items.length - 1 && (
            <span style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>/</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** 内容容器 */
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto"
      style={{ maxWidth: 1280, padding: '0 24px', paddingTop: 32, paddingBottom: 80 }}
    >
      {children}
    </main>
  );
}
