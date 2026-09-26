import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Download,
  Heart,
  Share2,
  Settings as SettingsIcon,
  History,
  Clock,
  Star,
  User,
  Loader2,
  AlertCircle,
  MessageSquare,
  Send,
  ArrowRight,
  Package,
  Layers,
  FileText,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { LoginPrompt } from '@/components/shared/LoginPrompt';
import { MarkdownRenderer } from '@/lib/markdown';
import {
  getTypeMeta,
  getTagBadgeClass,
  getSourceMeta,
  formatNumber,
  formatRelativeTime,
  formatDate,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  PageContainer,
  Breadcrumb,
  getAuthorName,
  getAuthorId,
  getTagStrings,
  getGalleryUrls,
  getDependencies,
  getStringArray,
  getCoverUrl,
  getResourceTitle,
  type ResourceDetailResponse,
  type Resource,
  type VersionItem,
} from './shared';

interface CommentAuthor {
  id?: string | number;
  username?: string;
  avatar_url?: string | null;
}

interface Comment {
  id: string | number;
  user_id?: string | number;
  username?: string;
  /** 后端新格式为对象，旧格式为字符串 */
  author?: CommentAuthor | string;
  author_username?: string;
  avatar_url?: string | null;
  content?: string;
  text?: string;
  rating?: number;
  created_at?: string;
  replies?: Comment[];
}

/** 从 comment.author 提取用户名（兼容 string 和 object 两种格式） */
function getCommentAuthorName(comment: Pick<Comment, 'username' | 'author' | 'author_username'>): string {
  const { username, author, author_username } = comment;
  if (typeof username === 'string' && username) return username;
  if (typeof author === 'object' && author !== null && author.username) return author.username;
  if (typeof author === 'string' && author) return author;
  return author_username || '匿名';
}

/** 从 comment.author 提取头像 URL */
function getCommentAvatarUrl(comment: Pick<Comment, 'author' | 'avatar_url'>): string | undefined {
  const { author } = comment;
  if (typeof author === 'object' && author !== null) {
    return author.avatar_url ?? undefined;
  }
  return comment.avatar_url ?? undefined;
}

interface CommentsResponse {
  success: boolean;
  comments?: Comment[];
  total?: number;
}

interface RatingResponse {
  success: boolean;
  rating_average?: number;
  rating_count?: number;
  rating_distribution?: Record<string, number>;
}

export default function DetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const slug = searchParams.get('slug') || searchParams.get('id') || '';

  const [resource, setResource] = useState<Resource | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratingInfo, setRatingInfo] = useState<{
    average: number;
    count: number;
    distribution: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'versions' | 'comments' | 'gallery'>('description');

  // 评论与评分表单
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 加载资源详情
  useEffect(() => {
    if (!slug) {
      setError('缺少资源标识');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchParams.get('slug')) params.set('slug', searchParams.get('slug')!);
        else params.set('id', searchParams.get('id')!);
        const res = await api.get<ResourceDetailResponse>(
          `/resources/detail.php?${params.toString()}`
        );
        if (cancelled) return;
        setResource(res.resource ?? null);
        // 后端 detail.php 只返回 latest_version（单个对象），把它包装成数组用于版本 tab 展示
        const r = res.resource as any;
        // 防御性检查：确保 versions 是数组
        let versionsArr: VersionItem[] = [];
        if (Array.isArray(r.versions)) {
          versionsArr = r.versions;
        } else if (r.latest_version && typeof r.latest_version === 'object') {
          versionsArr = [r.latest_version];
        }
        setVersions(versionsArr);
        // 同步关注状态（后端返回 is_following 字段）
        setFollowing(!!r.is_following);
        // 如果有关评论和评分信息，也设置
        if (r.rating_distribution) {
          setRatingInfo({
            average: r.rating_avg ?? r.rating ?? r.rating_average ?? 0,
            count: r.rating_count ?? 0,
            distribution: r.rating_distribution,
          });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载资源详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 加载评论
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (searchParams.get('slug')) params.set('slug', searchParams.get('slug')!);
        else params.set('id', searchParams.get('id')!);
        const res = await api.get<CommentsResponse>(
          `/resources/comment.php?${params.toString()}`
        );
        if (cancelled) return;
        // 防御性检查：确保 comments 是数组
        setComments(Array.isArray(res.comments) ? res.comments : []);
      } catch {
        // 静默失败
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // 下载最新版本
  const handleDownload = useCallback(
    async (versionId?: string | number, source?: string) => {
      if (!user) return; // LoginPrompt 会处理未登录情况
      if (!resource) return;
      setActionLoading(true);
      try {
        // 后端 download.php 期望 body 中包含 version_id 和 source_type
        // source 优先级：传入参数 > 资源最新版本的第一个文件源 > 资源 source 字段
        const latestFiles = (resource as any).latest_version?.files ?? [];
        const firstFileSource = latestFiles[0]?.source_type;
        const effectiveSource = source || firstFileSource || resource.source || '';
        if (!versionId) {
          alert('未找到可下载的版本');
          return;
        }
        if (!effectiveSource) {
          alert('未找到可用的下载源');
          return;
        }
        const body = {
          version_id: String(versionId),
          source_type: effectiveSource,
        };
        const res = await api.post<{ success: boolean; url?: string; redirect_url?: string }>(
          '/resources/download.php',
          body
        );
        const url = res.url || res.redirect_url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        if (err instanceof ApiError) alert(err.message);
        else alert('下载失败');
      } finally {
        setActionLoading(false);
      }
    },
    [resource, user]
  );

  // 关注 / 取消关注
  const handleFollow = useCallback(async () => {
    if (!user || !resource) return;
    setActionLoading(true);
    try {
      await api.post('/resources/follow.php', { resource_id: String(resource.id) });
      setFollowing((v) => !v);
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  }, [resource, user]);

  // 提交评论
  const handleSubmitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !resource) return;
      const content = newComment.trim();
      if (!content) return;
      setSubmitting(true);
      try {
        // 后端 comment.php 期望 body 中包含 resource_id 字段
        const payload: Record<string, unknown> = {
          resource_id: String(resource.id),
          content,
        };
        if (newRating > 0) payload.rating = newRating;
        await api.post('/resources/comment.php', payload);
        // comment.php 已经处理 rating 并更新 rating_avg/rating_count，无需再调 rate.php
        // 重新加载评论
        const res = await api.get<CommentsResponse>(
          `/resources/comment.php?id=${encodeURIComponent(String(resource.id))}`
        );
        setComments(Array.isArray(res.comments) ? res.comments : []);
        setNewComment('');
        setNewRating(0);
      } catch (err) {
        if (err instanceof ApiError) alert(err.message);
        else alert('提交评论失败');
      } finally {
        setSubmitting(false);
      }
    },
    [user, resource, newComment, newRating]
  );

  // 分享
  const handleShare = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: resource?.title || resource?.name || 'Air 资源',
          url: window.location.href,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      alert('链接已复制');
    }
  }, [resource]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingBlock label="加载资源详情中..." />
      </PageContainer>
    );
  }

  if (error || !resource) {
    return (
      <PageContainer>
        {error ? (
          <ErrorBlock message={error} />
        ) : (
          <EmptyState icon={<AlertCircle size={32} />} title="资源不存在" desc="找不到指定的资源" />
        )}
      </PageContainer>
    );
  }

  const meta = getTypeMeta(resource.type);
  const Icon = meta.icon;
  const tags = getTagStrings(resource.tags);
  const cover = getCoverUrl(resource);
  // 使用归一化函数处理 gallery，兼容 string[] 和 { image_url, caption }[] 两种格式
  const gallery = getGalleryUrls((resource as any).gallery);
  // 从 latest_version 读取 loaders 和 mc_versions（后端只在 latest_version 中返回）
  // 兼容旧资源：loaders/game_versions 可能不存在于 latest_version，需回退到 resource 顶层
  const latestVer = (resource as any).latest_version;
  const loaders = getStringArray(latestVer?.loaders ?? (resource as any).loaders);
  const gameVersions = getStringArray(
    latestVer?.mc_versions ?? latestVer?.game_versions ?? (resource as any).game_versions
  );
  // 兼容旧资源：file_formats 可能为字符串或非数组
  const fileFormats = getStringArray((resource as any).file_formats);
  // 兼容旧资源：license 可能为对象或字符串
  const rawLicense = (resource as any).license;
  const license =
    typeof rawLicense === 'string'
      ? rawLicense
      : rawLicense && typeof rawLicense === 'object'
        ? String(rawLicense.name ?? rawLicense.id ?? '')
        : '';
  const fileSize = (resource as any).file_size;
  // 使用归一化函数处理 dependencies，兼容 { name, version } 和 { dep_name, dep_version } 两种格式
  const dependencies = getDependencies((resource as any).dependencies);
  const authorName = getAuthorName(resource);
  const authorId = getAuthorId(resource);
  const title = getResourceTitle(resource);
  const downloads = resource.downloads_count ?? resource.downloads ?? resource.download_count ?? 0;
  const follows = resource.followers_count ?? resource.follows ?? resource.follow_count ?? 0;
  const rating = ratingInfo?.average ?? resource.rating_avg ?? resource.rating ?? resource.rating_average ?? 0;
  const ratingCount = ratingInfo?.count ?? resource.rating_count ?? 0;
  const sourceMeta = getSourceMeta(resource.source || (resource.sources && resource.sources[0]));
  const isAuthor = user && (user.id === String(authorId ?? (resource as any).author_id) || user.username === authorName);

  const breadcrumbItems = [
    { label: '资源中心', href: '/resources' },
    { label: meta.label, href: `/resources/list?type=${encodeURIComponent(resource.type || '')}` },
    { label: title },
  ];

  return (
    <PageContainer>
      <Breadcrumb items={breadcrumbItems} />

      {/* 顶部资源信息区 */}
      <section
        className="grid gap-8"
        style={{ gridTemplateColumns: '1fr 280px', alignItems: 'flex-start' }}
      >
        <div className="flex gap-6 flex-wrap">
          {/* 图标 */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 128,
              height: 128,
              borderRadius: 'var(--radius)',
              background: cover ? undefined : 'linear-gradient(135deg, var(--brand-200), var(--brand-300))',
              color: 'var(--accent-blue)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
            }}
          >
            {cover ? (
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            ) : (
              <Icon size={64} strokeWidth={1.5} />
            )}
          </div>
          {/* 信息 */}
          <div className="flex flex-col gap-3 min-w-0 flex-1">
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
              {title}
            </h1>
            <div
              className="inline-flex items-center gap-1.5 text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <User size={14} />
              <span>by</span>
              <a
                href={`/account.html#/account/profile/${encodeURIComponent(authorName)}`}
                style={{ color: 'var(--accent-blue)', fontWeight: 500 }}
              >
                {authorName}
              </a>
            </div>
            {/* 标签 */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`badge ${getTypeBadgeForMeta(meta)}`}>{meta.label}</span>
              {tags.map((tag) => (
                <span key={tag} className={`badge ${getTagBadgeClass(tag)}`}>
                  {tag}
                </span>
              ))}
            </div>
            {/* 下载源 */}
            {sourceMeta && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`source-label ${sourceMeta.badgeClass}`}>{sourceMeta.label}</span>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                  {resource.source === 'modrinth'
                    ? '同步自 Modrinth，由作者维护 iOS 适配分支'
                    : '来自外部源'}
                </span>
              </div>
            )}
            {/* 统计 */}
            <div
              className="flex items-center gap-4 flex-wrap text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Download size={14} />
                <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
                  {formatNumber(downloads)}
                </span>
                下载
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Star size={14} style={{ color: 'var(--color-star)' }} />
                <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
                  {rating > 0 ? rating.toFixed(1) : '-'}
                </span>
                星 ({ratingCount} 评分)
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Heart size={14} />
                <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
                  {formatNumber(follows)}
                </span>
                收藏
              </span>
              {resource.updated_at && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    {formatRelativeTime(resource.updated_at)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="flex flex-col gap-2.5" style={{ position: 'sticky', top: 88 }}>
          {user ? (
            <button
              type="button"
              onClick={() => handleDownload(versions[0]?.id, sourceMeta?.key)}
              disabled={actionLoading}
              className="btn-blue btn-lg btn-block"
            >
              {actionLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              下载最新版
            </button>
          ) : (
            <LoginPrompt
              trigger={
                <span className="btn-blue btn-lg btn-block">
                  <Download size={18} />
                  下载最新版
                </span>
              }
              message="下载资源需要登录"
            />
          )}

          {user ? (
            <button
              type="button"
              onClick={handleFollow}
              disabled={actionLoading}
              className={`btn-outline btn-block ${following ? 'btn-blue' : ''}`}
            >
              <Heart size={16} />
              {following ? '已收藏' : '收藏'}
            </button>
          ) : (
            <LoginPrompt
              trigger={
                <span className="btn-outline btn-block">
                  <Heart size={16} />
                  收藏
                </span>
              }
              message="收藏资源需要登录"
            />
          )}

          <button type="button" onClick={handleShare} className="btn-outline btn-block">
            <Share2 size={16} />
            分享
          </button>

          <Link
            to={`/resources/versions?id=${encodeURIComponent(String(resource.id))}`}
            className="btn-outline btn-block"
          >
            <History size={16} />
            查看版本
          </Link>

          {isAuthor && (
            <Link
              to={`/resources/settings?slug=${encodeURIComponent(String(resource.slug || resource.id))}`}
              className="text-sm text-center py-2"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <SettingsIcon size={14} style={{ display: 'inline', marginRight: 4 }} />
              管理资源（仅作者可见）
            </Link>
          )}
        </div>
      </section>

      {/* Tab 导航 */}
      <nav
        className="flex gap-1 flex-wrap mt-10"
        style={{
          borderBottom: '1px solid var(--border)',
        }}
      >
        <TabButton
          active={activeTab === 'description'}
          onClick={() => setActiveTab('description')}
        >
          描述
        </TabButton>
        <TabButton
          active={activeTab === 'versions'}
          onClick={() => setActiveTab('versions')}
          count={versions.length}
        >
          版本
        </TabButton>
        <TabButton
          active={activeTab === 'comments'}
          onClick={() => setActiveTab('comments')}
          count={comments.length}
        >
          评论
        </TabButton>
        <TabButton
          active={activeTab === 'gallery'}
          onClick={() => setActiveTab('gallery')}
          count={gallery.length}
        >
          画廊
        </TabButton>
      </nav>

      {/* Tab 内容 */}
      <div
        className="grid gap-8 mt-8"
        style={{ gridTemplateColumns: '1fr 320px', alignItems: 'flex-start' }}
      >
        {/* 主内容 */}
        <div className="min-w-0">
          {activeTab === 'description' && (
            <div className="flex flex-col gap-6">
              {/* 封面图 */}
              {cover && (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <img
                    src={cover}
                    alt={title}
                    className="w-full"
                    style={{ maxHeight: 400, objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Markdown 描述 */}
              <div>
                <h2
                  className="mb-4"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    color: 'var(--foreground)',
                    letterSpacing: 'var(--tracking-tight)',
                  }}
                >
                  关于这个资源
                </h2>
                {resource.description ? (
                  <MarkdownRenderer content={resource.description} />
                ) : (
                  <p style={{ color: 'var(--muted-foreground)' }}>暂无描述</p>
                )}
              </div>

              {/* 标签 */}
              {tags.length > 0 && (
                <div>
                  <h3
                    className="mb-3"
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--foreground)',
                    }}
                  >
                    标签
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className={`badge ${getTagBadgeClass(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 评分与评价 */}
              <RatingBlock
                average={rating}
                count={ratingCount}
                distribution={ratingInfo?.distribution}
                comments={comments}
              />

              {/* 发表评论 */}
              <CommentForm
                user={user}
                newComment={newComment}
                setNewComment={setNewComment}
                newRating={newRating}
                setNewRating={setNewRating}
                hoverRating={hoverRating}
                setHoverRating={setHoverRating}
                onSubmit={handleSubmitComment}
                submitting={submitting}
                onLogin={() => {
                  const redirect = encodeURIComponent(window.location.hash || '#/resources');
                  window.location.href = `/account.html#/account/sign-in?redirect=${redirect}`;
                }}
              />
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="flex flex-col gap-3">
              {versions.length === 0 ? (
                <EmptyState
                  icon={<History size={32} />}
                  title="暂无版本"
                  desc="该资源还没有发布版本"
                />
              ) : (
                versions.map((v) => (
                  <VersionRow
                    key={v.id}
                    version={v}
                    resourceId={String(resource.id)}
                    onDownload={() =>
                      user
                        ? handleDownload(v.id, sourceMeta?.key)
                        : undefined
                    }
                    canDownload={!!user}
                  />
                ))
              )}
              <Link
                to={`/resources/versions?id=${encodeURIComponent(String(resource.id))}`}
                className="inline-flex items-center gap-1 text-sm mt-2"
                style={{ color: 'var(--accent-blue)' }}
              >
                查看全部版本
                <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {activeTab === 'comments' && (
            <CommentList comments={comments} />
          )}

          {activeTab === 'gallery' && (
            <div>
              {gallery.length === 0 ? (
                <EmptyState
                  icon={<Package size={32} />}
                  title="暂无画廊图片"
                  desc="作者还未上传图片"
                />
              ) : (
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
                >
                  {gallery.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg overflow-hidden"
                      style={{ boxShadow: 'var(--shadow-sm)' }}
                    >
                      <img src={url} alt={`图片 ${idx + 1}`} className="w-full" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <aside className="flex flex-col gap-4" style={{ position: 'sticky', top: 88 }}>
          {/* 技术信息 */}
          <div
            className="rounded-lg p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3
              className="mb-3 flex items-center gap-2"
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
            >
              <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
              技术信息
            </h3>
            <div className="flex flex-col gap-2.5 text-sm">
              {loaders.length > 0 && (
                <InfoRow label="支持加载器">
                  {loaders.map((l: string) => (
                    <span key={l} className="badge badge-soft" style={{ fontSize: 11 }}>
                      {l}
                    </span>
                  ))}
                </InfoRow>
              )}
              {gameVersions.length > 0 && (
                <InfoRow label="支持版本">
                  {gameVersions.map((v: string) => (
                    <span
                      key={v}
                      className="badge badge-outline"
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </InfoRow>
              )}
              {fileFormats.length > 0 && (
                <InfoRow label="文件格式">
                  {fileFormats.map((f: string) => (
                    <span
                      key={f}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--foreground)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </InfoRow>
              )}
              {license && <InfoRow label="许可证"><span>{license}</span></InfoRow>}
              {fileSize && (
                <InfoRow label="文件大小">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{fileSize}</span>
                </InfoRow>
              )}
              {resource.latest_version && (
                <InfoRow label="最新版本">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {resource.latest_version.version_number || '未知'}
                  </span>
                  <span className="badge badge-green" style={{ fontSize: 10, marginLeft: 4 }}>
                    Latest
                  </span>
                </InfoRow>
              )}
              {resource.created_at && (
                <InfoRow label="创建时间">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(resource.created_at)}</span>
                </InfoRow>
              )}
              {resource.updated_at && (
                <InfoRow label="更新时间">
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(resource.updated_at)}</span>
                </InfoRow>
              )}
            </div>
          </div>

          {/* 版本列表 */}
          {versions.length > 0 && (
            <div
              className="rounded-lg p-5"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3
                className="mb-3 flex items-center gap-2"
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
              >
                <Layers size={16} style={{ color: 'var(--accent-blue)' }} />
                版本列表
              </h3>
              <div className="flex flex-col gap-2">
                {versions.slice(0, 5).map((v) => (
                  <Link
                    key={v.id}
                    to={`/resources/version?id=${encodeURIComponent(String(v.id))}`}
                    className="flex items-center justify-between gap-2 p-2 rounded text-sm transition-colors"
                    style={{ color: 'var(--foreground)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {v.version_number || v.version || '未知'}
                    </span>
                    {v.is_latest && (
                      <span className="badge badge-green" style={{ fontSize: 10 }}>
                        Latest
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <Link
                to={`/resources/versions?id=${encodeURIComponent(String(resource.id))}`}
                className="inline-flex items-center gap-1 text-xs mt-3"
                style={{ color: 'var(--accent-blue)' }}
              >
                查看全部
                <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* 依赖 */}
          {dependencies.length > 0 && (
            <div
              className="rounded-lg p-5"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3
                className="mb-3 flex items-center gap-2"
                style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
              >
                <Package size={16} style={{ color: 'var(--accent-blue)' }} />
                依赖
              </h3>
              <div className="flex flex-col gap-2">
                {dependencies.map((dep: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div
                        className="truncate"
                        style={{ color: 'var(--foreground)', fontWeight: 500 }}
                      >
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
            </div>
          )}
        </aside>
      </div>

    </PageContainer>
  );
}

/* ============ 子组件 ============ */

function getTypeBadgeForMeta(meta: ReturnType<typeof getTypeMeta>): string {
  return 'badge-soft';
}

function TabButton({
  active,
  onClick,
  children,
  count,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-3 text-sm transition-colors"
      style={{
        color: active ? 'var(--accent-blue)' : 'var(--muted-foreground)',
        fontWeight: active ? 600 : 500,
        borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent',
        marginBottom: '-1px',
      }}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className="badge badge-muted"
          style={{ fontSize: 10, padding: '2px 6px' }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>{label}</span>
      <span className="inline-flex items-center gap-1 flex-wrap justify-end">{children}</span>
    </div>
  );
}

function VersionRow({
  version,
  resourceId,
  onDownload,
  canDownload,
}: {
  version: VersionItem;
  resourceId: string;
  onDownload?: () => void;
  canDownload: boolean;
}) {
  const versionLabel = version.version_number || version.version || '未知';
  const versionType = version.version_type || version.type || 'release';
  const typeLabel = versionType === 'beta' ? 'Beta' : versionType === 'alpha' ? '快照' : '正式版';
  const typeBadgeClass =
    versionType === 'beta' ? 'badge-orange' : versionType === 'alpha' ? 'badge-gray' : 'badge-green';
  // 兼容旧资源：loaders/game_versions/mc_versions 可能为非数组
  const loaders = getStringArray(version.loaders);
  const gameVersions = getStringArray(version.game_versions ?? version.mc_versions);
  const fileSize = version.file_size || version.size;
  const downloads = version.downloads ?? version.download_count ?? version.downloads_count ?? 0;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
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
          <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {version.published_at && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {formatDate(version.published_at)}
              </span>
            )}
            {loaders.length > 0 && (
              <span>
                加载器: {loaders.join(', ')}
              </span>
            )}
            {gameVersions.length > 0 && (
              <span>
                MC 版本: {gameVersions.join(', ')}
              </span>
            )}
            {fileSize && <span>大小: {fileSize}</span>}
            <span className="inline-flex items-center gap-1">
              <Download size={12} />
              {formatNumber(downloads)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDownload ? (
            <button
              type="button"
              onClick={onDownload}
              className="btn-blue btn-sm"
            >
              <Download size={14} />
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
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function RatingBlock({
  average,
  count,
  distribution,
  comments,
}: {
  average: number;
  count: number;
  distribution?: Record<string, number>;
  comments: Comment[];
}) {
  const dist: Record<string, number> = distribution ?? {};
  const defaultDist: Record<string, number> = count > 0
    ? { '5': Math.round(count * 0.8), '4': Math.round(count * 0.15), '3': Math.round(count * 0.03), '2': Math.round(count * 0.01), '1': Math.round(count * 0.01) }
    : { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  const finalDist: Record<string, number> = Object.keys(dist).length > 0 ? dist : defaultDist;

  return (
    <div
      className="rounded-lg p-6"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h3
        className="mb-4"
        style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
      >
        评分与评价
      </h3>
      <div className="flex gap-6 flex-wrap">
        <div className="flex flex-col items-center gap-1">
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 40,
              color: 'var(--foreground)',
              lineHeight: 1,
            }}
          >
            {average > 0 ? average.toFixed(1) : '-'}
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={16}
                style={{
                  color: n <= Math.round(average) ? 'var(--color-star)' : 'var(--border-strong)',
                  fill: n <= Math.round(average) ? 'var(--color-star)' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            基于 {count} 条评价
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const c = finalDist[String(star)] ?? 0;
            const pct = count > 0 ? Math.round((c / count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span style={{ color: 'var(--muted-foreground)', width: 32 }}>{star}星</span>
                <div
                  className="flex-1 rounded"
                  style={{ background: 'var(--muted)', height: 6 }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: 'var(--color-star)',
                      borderRadius: 'inherit',
                    }}
                  />
                </div>
                <span style={{ color: 'var(--muted-foreground)', width: 36, textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 评论列表预览 */}
      {comments.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {comments.slice(0, 3).map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const username = getCommentAuthorName(comment);
  const initials = username.slice(0, 2).toUpperCase();
  const content = comment.content || comment.text || '';
  const rating = comment.rating ?? 0;
  // 已注销账号使用灰色头像
  const isDeactivated = /^已注销账号-\d+$/.test(username);

  return (
    <div className="flex gap-3">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isDeactivated
            ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
            : 'var(--accent-blue-soft)',
          color: isDeactivated ? '#f3f4f6' : 'var(--accent-blue)',
          filter: isDeactivated ? 'grayscale(1)' : undefined,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: 13 }}>
            {username}
          </span>
          {rating > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={11}
                  style={{
                    color: n <= rating ? 'var(--color-star)' : 'var(--border-strong)',
                    fill: n <= rating ? 'var(--color-star)' : 'transparent',
                  }}
                />
              ))}
            </span>
          )}
          {comment.created_at && (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {formatRelativeTime(comment.created_at)}
            </span>
          )}
        </div>
        <div className="text-sm" style={{ color: 'var(--foreground)', lineHeight: 1.6 }}>
          {content}
        </div>
      </div>
    </div>
  );
}

function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare size={32} />}
        title="暂无评论"
        desc="成为第一个评论的人吧"
      />
    );
  }
  return (
    <div
      className="rounded-lg p-6"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h3
        className="mb-4"
        style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
      >
        全部评论 ({comments.length})
      </h3>
      <div className="flex flex-col gap-5">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </div>
    </div>
  );
}

function CommentForm({
  user,
  newComment,
  setNewComment,
  newRating,
  setNewRating,
  hoverRating,
  setHoverRating,
  onSubmit,
  submitting,
  onLogin,
}: {
  user: ReturnType<typeof useAuth>['user'];
  newComment: string;
  setNewComment: (v: string) => void;
  newRating: number;
  setNewRating: (v: number) => void;
  hoverRating: number;
  setHoverRating: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  onLogin: () => void;
}) {
  if (!user) {
    return (
      <div
        className="rounded-lg p-5 flex items-center gap-3 flex-wrap"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex-1 min-w-0">
          <div style={{ color: 'var(--foreground)', fontWeight: 500, fontSize: 14 }}>
            撰写评价
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            登录后即可对资源进行评分与评论
          </div>
        </div>
        <button type="button" onClick={onLogin} className="btn-blue btn-sm">
          登录
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg p-5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}
    >
      <h3
        className="mb-3"
        style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}
      >
        撰写评价
      </h3>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          评分:
        </span>
        <div className="inline-flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNewRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer' }}
            >
              <Star
                size={20}
                style={{
                  color: n <= (hoverRating || newRating) ? 'var(--color-star)' : 'var(--border-strong)',
                  fill: n <= (hoverRating || newRating) ? 'var(--color-star)' : 'transparent',
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="分享你的使用体验..."
        rows={4}
        className="form-textarea"
        style={{ width: '100%' }}
      />
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="btn-blue btn-sm"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          发布评论
        </button>
      </div>
    </form>
  );
}
