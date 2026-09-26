import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Clock,
  History,
  AlertCircle,
  Loader2,
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
  formatNumber,
  formatDate,
  type VersionsResponse,
  type VersionItem,
} from './shared';

interface GroupedVersions {
  gameVersion: string;
  versions: VersionItem[];
}

export default function VersionsPage() {
  const [searchParams] = useSearchParams();
  const resourceId = searchParams.get('id') || '';
  const { user } = useAuth();

  const [data, setData] = useState<VersionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaderFilter, setLoaderFilter] = useState<string>('');
  const [gameVersionFilter, setGameVersionFilter] = useState<string>('');

  useEffect(() => {
    if (!resourceId) {
      setError('缺少资源 ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<VersionsResponse>(
          `/resources/versions.php?id=${encodeURIComponent(resourceId)}`
        );
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载版本列表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  // 收集所有加载器和游戏版本
  const allLoaders = useMemo(() => {
    const set = new Set<string>();
    (data?.versions ?? []).forEach((v) => {
      (v.loaders ?? []).forEach((l) => set.add(l));
    });
    return Array.from(set);
  }, [data]);

  const allGameVersions = useMemo(() => {
    const set = new Set<string>();
    (data?.versions ?? []).forEach((v) => {
      (v.game_versions ?? []).forEach((g) => set.add(g));
    });
    return Array.from(set);
  }, [data]);

  // 过滤后的版本
  const filteredVersions = useMemo(() => {
    let list = data?.versions ?? [];
    if (loaderFilter) {
      list = list.filter((v) => (v.loaders ?? []).includes(loaderFilter));
    }
    if (gameVersionFilter) {
      list = list.filter((v) => (v.game_versions ?? []).includes(gameVersionFilter));
    }
    return list;
  }, [data, loaderFilter, gameVersionFilter]);

  // 按游戏版本分组
  const grouped = useMemo(() => {
    const map = new Map<string, VersionItem[]>();
    filteredVersions.forEach((v) => {
      const gvs = v.game_versions ?? [];
      if (gvs.length === 0) {
        const key = '其他';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(v);
      } else {
        gvs.forEach((gv) => {
          if (!map.has(gv)) map.set(gv, []);
          map.get(gv)!.push(v);
        });
      }
    });
    const result: GroupedVersions[] = [];
    map.forEach((versions, gameVersion) => {
      result.push({ gameVersion, versions });
    });
    // 按版本号倒序排序（简单字符串比较）
    result.sort((a, b) => b.gameVersion.localeCompare(a.gameVersion, 'zh-CN', { numeric: true }));
    return result;
  }, [filteredVersions]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingBlock label="加载版本列表中..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorBlock message={error} />
      </PageContainer>
    );
  }

  // 后端 versions.php 不返回 resource/total 字段，使用本地 fallback
  const resourceName = data?.resource?.title ?? data?.resource?.name ?? '资源';
  const resourceSlug = data?.resource?.slug || resourceId;
  const total = data?.total ?? filteredVersions.length;

  const breadcrumbItems = [
    { label: '资源中心', href: '/resources' },
    { label: '资源详情', href: `/resources/detail?slug=${encodeURIComponent(String(resourceSlug))}` },
    { label: '版本' },
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
            <span>Resources / 版本历史</span>
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
            版本历史
          </h1>
          <p className="inline-flex items-center gap-1.5" style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0 }}>
            <History size={14} />
            {resourceName} 的所有版本（共 {total} 个）
          </p>
        </div>
        <Link
          to={`/resources/detail?slug=${encodeURIComponent(String(resourceSlug))}`}
          className="btn-outline"
        >
          <ArrowLeft size={16} />
          返回资源
        </Link>
      </section>

      {/* 版本筛选 */}
      {(allLoaders.length > 0 || allGameVersions.length > 0) && (
        <div
          className="flex flex-col gap-3 p-4 rounded-lg mb-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          {allLoaders.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                加载器
              </span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip
                  label="全部"
                  active={!loaderFilter}
                  onClick={() => setLoaderFilter('')}
                />
                {allLoaders.map((l) => (
                  <FilterChip
                    key={l}
                    label={l}
                    active={loaderFilter === l}
                    onClick={() => setLoaderFilter(l)}
                  />
                ))}
              </div>
            </div>
          )}
          {allGameVersions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                MC 版本
              </span>
              <div className="flex gap-1.5 flex-wrap">
                <FilterChip
                  label="全部"
                  active={!gameVersionFilter}
                  onClick={() => setGameVersionFilter('')}
                />
                {allGameVersions.map((v) => (
                  <FilterChip
                    key={v}
                    label={v}
                    active={gameVersionFilter === v}
                    onClick={() => setGameVersionFilter(v)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 版本列表（按游戏版本分组） */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={32} />}
          title="暂无版本"
          desc="该资源还没有发布版本"
        />
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map((group) => (
            <section key={group.gameVersion}>
              <h2
                className="mb-4 inline-flex items-center gap-2"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 20,
                  color: 'var(--foreground)',
                  letterSpacing: 'var(--tracking-tight)',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-blue-soft)',
                    color: 'var(--accent-blue)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  MC {group.gameVersion}
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {group.versions.map((v) => (
                  <VersionCard
                    key={v.id}
                    version={v}
                    canDownload={!!user}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

    </PageContainer>
  );
}

/* ============ 子组件 ============ */

function FilterChip({
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
      className="badge"
      style={{
        cursor: 'pointer',
        background: active ? 'var(--accent-blue)' : 'transparent',
        color: active ? 'var(--accent-blue-foreground)' : 'var(--foreground)',
        border: '1px solid var(--border-strong)',
        padding: '4px 12px',
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );
}

function VersionCard({
  version,
  canDownload,
}: {
  version: VersionItem;
  canDownload: boolean;
}) {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const versionLabel = version.version_number || version.version || '未知';
  const versionType = version.version_type || version.type || 'release';
  const typeLabel = versionType === 'beta' ? 'Beta' : versionType === 'alpha' ? '快照' : '正式版';
  const typeBadgeClass =
    versionType === 'beta' ? 'badge-orange' : versionType === 'alpha' ? 'badge-gray' : 'badge-green';
  const loaders = version.loaders ?? [];
  const gameVersions = version.mc_versions ?? version.game_versions ?? [];
  const fileSize = version.file_size || version.size;
  const downloads = version.downloads_count ?? version.downloads ?? version.download_count ?? 0;
  // 后端返回 files 数组，前端兼容读取 sources/files
  const sources = (version.files ?? version.sources ?? []) as any[];

  // 统一下载逻辑：所有源都走 download.php，确保下载计数正确且 Air 源能正常工作
  // 修复前 bug：直接用 source_url 作为 a 标签的 href，但 Air 源不存储 source_url，
  // 导致 Air 源下载按钮跳到 '#'，无法下载文件
  const handleDownload = useCallback(async () => {
    const firstSource = sources[0];
    if (!firstSource) {
      alert('未找到下载源');
      return;
    }
    const sourceKey = (firstSource as any).source_type ?? (firstSource as any).source;
    const sourceUrl = (firstSource as any).source_url ?? (firstSource as any).url;

    // 外部源（modrinth/curseforge/github）：直接打开 URL，不经过 download.php
    // （外部源无需登录认证，直接跳转到外部链接）
    if (sourceUrl && (sourceKey === 'modrinth' || sourceKey === 'curseforge' || sourceKey === 'github')) {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Air 源或其他需要登录的源：调用 download.php 获取预签名 URL
    if (!canDownload) return; // LoginPrompt 会处理未登录情况
    setDownloadLoading(true);
    try {
      const res = await api.post<{ success: boolean; url?: string; redirect_url?: string; filename?: string }>(
        '/resources/download.php',
        {
          version_id: String(version.id),
          source_type: sourceKey,
        }
      );
      const url = res.url || res.redirect_url || sourceUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('未获取到下载链接');
      }
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('下载失败');
    } finally {
      setDownloadLoading(false);
    }
  }, [sources, version.id, canDownload]);

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* 左侧版本号 + 标签 */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              {versionLabel}
            </span>
            {version.is_latest && (
              <span className="badge badge-green" style={{ fontSize: 10 }}>
                Latest
              </span>
            )}
            <span className={`badge ${typeBadgeClass}`} style={{ fontSize: 10 }}>
              {typeLabel}
            </span>
          </div>
          <div
            className="flex items-center gap-4 flex-wrap text-xs"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {version.published_at && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {formatDate(version.published_at)}
              </span>
            )}
            {loaders.length > 0 && (
              <span>
                <span style={{ opacity: 0.7 }}>加载器:</span>{' '}
                <span style={{ color: 'var(--foreground)' }}>{loaders.join(', ')}</span>
              </span>
            )}
            {gameVersions.length > 0 && (
              <span>
                <span style={{ opacity: 0.7 }}>MC 版本:</span>{' '}
                <span style={{ color: 'var(--foreground)', fontFamily: 'var(--font-mono)' }}>
                  {gameVersions.join(', ')}
                </span>
              </span>
            )}
            {fileSize && (
              <span>
                <span style={{ opacity: 0.7 }}>大小:</span>{' '}
                <span style={{ color: 'var(--foreground)', fontFamily: 'var(--font-mono)' }}>{fileSize}</span>
              </span>
            )}
          </div>
          {/* 下载源 */}
          {sources.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {sources.map((s, idx) => {
                // 后端返回 source_type，前端封装可能用 source
                const sourceKey = (s as any).source_type ?? (s as any).source;
                const meta = getSourceMetaForVersion(sourceKey);
                if (!meta) return null;
                return (
                  <span
                    key={idx}
                    className={`source-label ${meta.badgeClass}`}
                    style={{ fontSize: 10 }}
                  >
                    {meta.label}
                  </span>
                );
              })}
              {version.changelog && (
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  · {version.changelog.slice(0, 50)}
                  {version.changelog.length > 50 ? '...' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 右侧操作 */}
        <div className="flex flex-col gap-2 items-end">
          <div
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Download size={12} />
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
              {formatNumber(downloads)}
            </span>
            <span>下载</span>
          </div>
          <div className="flex items-center gap-2">
            {canDownload ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloadLoading}
                className="btn-blue btn-sm"
              >
                {downloadLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                下载
              </button>
            ) : (
              <LoginPrompt
                trigger={
                  <span className="btn-blue btn-sm">
                    <Download size={14} />
                    下载
                  </span>
                }
                message="下载版本需要登录"
              />
            )}
            <Link
              to={`/resources/version?id=${encodeURIComponent(String(version.id))}`}
              className="btn-outline btn-sm"
            >
              查看详情
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSourceMetaForVersion(source: string) {
  const key = (source || '').toLowerCase();
  if (key === 'modrinth') {
    return { label: 'Modrinth', badgeClass: 'source-modrinth' };
  }
  if (key === 'curseforge') {
    return { label: 'CurseForge', badgeClass: 'source-curseforge' };
  }
  if (key === 'github' || key === 'official') {
    return { label: 'GitHub', badgeClass: 'source-official' };
  }
  if (key === 'air' || key === 'bmclapi' || key === 'air官网') {
    return { label: 'Air 官网', badgeClass: 'source-bmclapi' };
  }
  return null;
}
