import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Clock,
  Copy,
  FileText,
  Package,
  Layers,
  AlertCircle,
  Loader2,
  Check,
  ExternalLink,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { LoginPrompt } from '@/components/shared/LoginPrompt';
import { MarkdownRenderer } from '@/lib/markdown';
import {
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  Breadcrumb,
  formatDate,
  formatNumber,
  getSourceMeta,
  type VersionDetailResponse,
  type VersionItem,
} from './shared';

interface VersionSource {
  source: string;
  url?: string;
  filename?: string;
  size?: string;
  sha256?: string;
}

export default function VersionDetailPage() {
  const [searchParams] = useSearchParams();
  const versionId = searchParams.get('id') || '';
  const { user } = useAuth();

  const [data, setData] = useState<VersionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId) {
      setError('缺少版本 ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<VersionDetailResponse>(
          `/resources/version-detail.php?id=${encodeURIComponent(versionId)}`
        );
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载版本详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  const handleDownload = useCallback(
    async (source: VersionSource) => {
      const meta = getSourceMeta(source.source);
      // 外部源直接打开 URL
      if (source.url && (source.source === 'modrinth' || source.source === 'curseforge' || source.source === 'github')) {
        window.open(source.url, '_blank', 'noopener,noreferrer');
        return;
      }
      // Air 官网源 - 调用 download API
      if (!user) return; // LoginPrompt 会处理
      if (source.source === 'air' && !source.url) {
        alert('Air 官网对象存储即将上线，暂未配置');
        return;
      }
      setDownloadLoading(source.source);
      try {
        const params = new URLSearchParams();
        params.set('version_id', versionId);
        params.set('source', source.source);
        const res = await api.post<{ success: boolean; url?: string; redirect_url?: string }>(
          `/resources/download.php?${params.toString()}`
        );
        const url = res.url || res.redirect_url || source.url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        if (err instanceof ApiError) alert(err.message);
        else alert('下载失败');
      } finally {
        setDownloadLoading(null);
      }
    },
    [versionId, user]
  );

  const copyHash = useCallback((hash: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hash).then(() => {
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(null), 2000);
      });
    }
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <LoadingBlock label="加载版本详情中..." />
      </PageContainer>
    );
  }

  if (error || !data?.version) {
    return (
      <PageContainer>
        {error ? (
          <ErrorBlock message={error} />
        ) : (
          <EmptyState icon={<AlertCircle size={32} />} title="版本不存在" desc="找不到指定的版本" />
        )}
      </PageContainer>
    );
  }

  const version = data.version;
  const resource = data.resource;
  const versionLabel = version.version_number || version.version || '未知';
  const versionType = version.version_type || version.type || 'release';
  const typeLabel = versionType === 'beta' ? 'Beta' : versionType === 'alpha' ? '快照' : '正式版';
  const typeBadgeClass =
    versionType === 'beta' ? 'badge-orange' : versionType === 'alpha' ? 'badge-gray' : 'badge-green';
  const loaders = version.loaders ?? [];
  const gameVersions = version.game_versions ?? [];
  const fileSize = version.file_size || version.size;
  const downloads = version.downloads ?? version.download_count ?? 0;
  const sources = (version.sources ?? []) as VersionSource[];
  const dependencies = version.dependencies ?? [];
  const resourceSlug = resource?.slug || resource?.id || '';

  const breadcrumbItems = [
    { label: '资源中心', href: '/resources' },
    { label: resource?.name || '资源', href: `/resources/detail?slug=${encodeURIComponent(String(resourceSlug))}` },
    { label: '版本', href: `/resources/versions?id=${encodeURIComponent(String(resource?.id || ''))}` },
    { label: versionLabel },
  ];

  return (
    <PageContainer>
      <Breadcrumb items={breadcrumbItems} />

      <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'flex-start' }}>
        {/* 主内容区 */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* 版本头部 */}
          <section>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 32,
                  lineHeight: 1.15,
                  color: 'var(--foreground)',
                  letterSpacing: 'var(--tracking-tight)',
                  margin: 0,
                }}
              >
                版本 {versionLabel}
              </h1>
              {version.is_latest && (
                <span className="badge badge-green" style={{ fontSize: 11 }}>
                  Latest
                </span>
              )}
              <span className={`badge ${typeBadgeClass}`} style={{ fontSize: 11 }}>
                {typeLabel}
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {version.published_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatDate(version.published_at)} 发布
                </span>
              )}
            </div>
          </section>

          {/* 更新日志 */}
          {version.changelog && (
            <section>
              <h2
                className="mb-4 inline-flex items-center gap-2"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--foreground)',
                }}
              >
                <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
                更新日志
              </h2>
              <div
                className="rounded-lg p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <MarkdownRenderer content={version.changelog} />
              </div>
            </section>
          )}

          {/* 下载文件 */}
          <section>
            <h2
              className="mb-4 inline-flex items-center gap-2"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              <Download size={18} style={{ color: 'var(--accent-blue)' }} />
              下载文件
            </h2>
            {sources.length === 0 ? (
              <EmptyState
                icon={<Download size={28} />}
                title="暂无下载源"
                desc="该版本还没有可用的下载源"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {sources.map((s, idx) => (
                  <FileRow
                    key={idx}
                    source={s}
                    onDownload={() => handleDownload(s)}
                    onCopyHash={() => s.sha256 && copyHash(s.sha256)}
                    copied={copiedHash === s.sha256}
                    loading={downloadLoading === s.source}
                    canDownload={!!user}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 依赖项 */}
          {dependencies.length > 0 && (
            <section>
              <h2
                className="mb-4 inline-flex items-center gap-2"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--foreground)',
                }}
              >
                <Package size={18} style={{ color: 'var(--accent-blue)' }} />
                依赖项
              </h2>
              <div className="flex flex-col gap-2">
                {dependencies.map((dep, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                    }}
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
                      <Layers size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: 14 }}>
                        {dep.name}
                      </div>
                      {dep.version && (
                        <div
                          className="text-xs"
                          style={{
                            color: 'var(--muted-foreground)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {dep.version}
                        </div>
                      )}
                    </div>
                    {dep.type && (
                      <span className="badge badge-muted" style={{ fontSize: 10 }}>
                        {dep.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 侧边栏 */}
        <aside className="flex flex-col gap-4" style={{ position: 'sticky', top: 88 }}>
          {/* 版本信息 */}
          <div
            className="rounded-lg p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3
              className="mb-3 inline-flex items-center gap-2"
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
            >
              <Clock size={16} style={{ color: 'var(--accent-blue)' }} />
              版本信息
            </h3>
            <div className="flex flex-col gap-2.5 text-sm">
              <InfoRow label="版本号">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{versionLabel}</span>
              </InfoRow>
              <InfoRow label="版本类型">
                <span>{typeLabel}</span>
                {version.is_latest && (
                  <span className="badge badge-green" style={{ fontSize: 10, marginLeft: 4 }}>
                    Latest
                  </span>
                )}
              </InfoRow>
              {version.published_at && (
                <InfoRow label="发布日期">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(version.published_at)}</span>
                </InfoRow>
              )}
              {loaders.length > 0 && (
                <InfoRow label="加载器">
                  <span>{loaders.join(', ')}</span>
                </InfoRow>
              )}
              {gameVersions.length > 0 && (
                <InfoRow label="MC 版本">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{gameVersions.join(', ')}</span>
                </InfoRow>
              )}
              {fileSize && (
                <InfoRow label="文件大小">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fileSize}</span>
                </InfoRow>
              )}
              <InfoRow label="下载次数">
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(downloads)}</span>
              </InfoRow>
            </div>
          </div>

          {/* 下载卡片 */}
          <div
            className="rounded-lg p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3
              className="mb-3 inline-flex items-center gap-2"
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
            >
              <Download size={16} style={{ color: 'var(--accent-blue)' }} />
              下载
            </h3>
            <div className="flex flex-col gap-2">
              {sources.length === 0 ? (
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  暂无可用下载源
                </span>
              ) : (
                sources.map((s, idx) => {
                  const meta = getSourceMeta(s.source);
                  if (!meta) return null;
                  const isAirSource = s.source === 'air' && !s.url;
                  return (
                    <DownloadSourceButton
                      key={idx}
                      meta={meta}
                      url={s.url}
                      disabled={isAirSource}
                      isAir={isAirSource}
                      loading={downloadLoading === s.source}
                      onClick={() => handleDownload(s)}
                      canDownload={!!user}
                    />
                  );
                })
              )}
            </div>
            {sources[0] && (
              <div
                className="mt-3 text-xs inline-flex items-center gap-1"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <Download size={12} />
                来自 {getSourceMeta(sources[0].source)?.label ?? '未知源'}
                {fileSize ? ` · ${fileSize}` : ''}
              </div>
            )}
          </div>

          {/* 返回按钮 */}
          {resource && (
            <Link
              to={`/resources/versions?id=${encodeURIComponent(String(resource.id))}`}
              className="btn-outline btn-block"
            >
              <ArrowLeft size={16} />
              查看全部版本
            </Link>
          )}
        </aside>
      </div>

    </PageContainer>
  );
}

/* ============ 子组件 ============ */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>{label}</span>
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}

function FileRow({
  source,
  onDownload,
  onCopyHash,
  copied,
  loading,
  canDownload,
}: {
  source: VersionSource;
  onDownload: () => void;
  onCopyHash: () => void;
  copied: boolean;
  loading: boolean;
  canDownload: boolean;
}) {
  const meta = getSourceMeta(source.source);
  if (!meta) return null;
  const isExternal = source.source === 'modrinth' || source.source === 'curseforge' || source.source === 'github';
  const isAir = source.source === 'air' && !source.url;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-blue-soft)',
            color: 'var(--accent-blue)',
          }}
        >
          <FileText size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <div style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: 14, wordBreak: 'break-all' }}>
            {source.filename || `${meta.label} 下载`}
          </div>
          <div
            className="flex items-center gap-2 flex-wrap mt-1 text-xs"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {source.size && (
              <span style={{ fontFamily: 'var(--font-mono)' }}>{source.size}</span>
            )}
            <span className={`source-label ${meta.badgeClass}`} style={{ fontSize: 10 }}>
              {meta.label}
            </span>
            {source.url && isExternal && (
              <span className="inline-flex items-center gap-0.5">
                <ExternalLink size={10} />
                外部链接
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          {isAir ? (
            // TODO: 对象存储配置后启用
            <span
              className="btn-blue btn-sm"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="对象存储即将上线"
            >
              <Download size={14} />
              暂未配置
            </span>
          ) : isExternal ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-blue btn-sm"
              style={{ background: meta.color }}
            >
              <Download size={14} />
              下载
            </a>
          ) : canDownload ? (
            <button
              type="button"
              onClick={onDownload}
              disabled={loading}
              className="btn-blue btn-sm"
              style={{ background: meta.color }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              下载
            </button>
          ) : (
            <LoginPrompt
              trigger={
                <span
                  className="btn-blue btn-sm"
                  style={{ background: meta.color }}
                >
                  <Download size={14} />
                  下载
                </span>
              }
              message="下载文件需要登录"
            />
          )}
        </div>
      </div>
      {source.sha256 && (
        <div
          className="mt-3 flex items-center gap-2 pt-3 text-xs"
          style={{
            borderTop: '1px dashed var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--accent-blue)',
              fontWeight: 600,
            }}
          >
            SHA256
          </span>
          <code
            className="flex-1 truncate"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--foreground)',
            }}
            title={source.sha256}
          >
            {source.sha256}
          </code>
          <button
            type="button"
            onClick={onCopyHash}
            className="inline-flex items-center gap-1 px-2 py-1 rounded"
            style={{
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              transition: 'color 0.16s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function DownloadSourceButton({
  meta,
  url,
  disabled,
  isAir,
  loading,
  onClick,
  canDownload,
}: {
  meta: ReturnType<typeof getSourceMeta>;
  url?: string;
  disabled?: boolean;
  isAir?: boolean;
  loading?: boolean;
  onClick: () => void;
  canDownload: boolean;
}) {
  if (!meta) return null;
  const isExternal = meta.key !== 'air' && url;

  if (isAir) {
    // TODO: 对象存储配置后启用
    return (
      <div
        className="text-center py-2 px-3 rounded text-sm"
        style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
          border: '1px dashed var(--border-strong)',
        }}
      >
        <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        对象存储即将上线
      </div>
    );
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="btn-block btn-sm"
        style={{
          background: 'var(--muted)',
          color: 'var(--muted-foreground)',
          cursor: 'not-allowed',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          fontSize: 13,
        }}
      >
        暂未配置
      </button>
    );
  }

  const btn = (
    <span
      className="btn-blue btn-sm btn-block"
      style={{ background: meta.color }}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Download size={14} />
      )}
      {meta.label}
    </span>
  );

  if (isExternal && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full"
      >
        {btn}
      </a>
    );
  }

  if (!canDownload) {
    return (
      <LoginPrompt trigger={btn} message={`从 ${meta.label} 下载需要登录`} />
    );
  }

  return (
    <button type="button" onClick={onClick} className="inline-block w-full">
      {btn}
    </button>
  );
}
