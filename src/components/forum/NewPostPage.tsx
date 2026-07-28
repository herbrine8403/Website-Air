import { useState, useCallback, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Loader2,
  Eye,
  Edit,
  X,
  Plus,
  MessageSquare,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { MarkdownRenderer } from '@/lib/markdown';
import {
  POST_TYPES,
  FORUM_CATEGORIES,
  PageContainer,
  Breadcrumb,
  getDetailHref,
  type PostType,
} from './shared';

const TAG_SUGGESTIONS = [
  'iOS移植',
  '修改版',
  '触屏适配',
  'AirPack',
  'TrollStore',
  'Fabric',
  'Forge',
  'NeoForge',
  '渲染器',
  '性能优化',
  '整合包',
  'Mod',
  '光影包',
  '材质包',
  '求助',
  '教程',
];

export default function NewPostPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 从 URL 读取初始类型
  const initialType = (searchParams.get('type') as PostType) || 'topic';
  const [type, setType] = useState<PostType>(
    POST_TYPES.some((t) => t.key === initialType) ? initialType : 'topic'
  );

  // 表单字段
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(FORUM_CATEGORIES[0].key);
  const [coverImage, setCoverImage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [bounty, setBounty] = useState<number | ''>('');
  const [supplement, setSupplement] = useState('');

  // 编辑器状态
  const [previewMode, setPreviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
      }
      setTagInput('');
    },
    [tags]
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        type,
        title: title.trim(),
        content: content.trim(),
      };
      if (type === 'topic') {
        payload.category = category;
        if (tags.length > 0) payload.tags = tags;
      } else if (type === 'article') {
        if (coverImage.trim()) payload.cover_image = coverImage.trim();
        if (tags.length > 0) payload.tags = tags;
      } else if (type === 'question') {
        if (bounty !== '' && bounty > 0) payload.bounty = bounty;
        if (supplement.trim()) payload.supplement = supplement.trim();
        if (tags.length > 0) payload.tags = tags;
      }
      const res = await api.post<{ success: boolean; id: string | number }>('/forum/new-post.php', payload);
      if (res.success && res.id != null) {
        navigate(getDetailHref(type, res.id), { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--foreground)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.16s ease',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--foreground)',
    marginBottom: 6,
  };

  return (
    <PageContainer>
      <Breadcrumb
        items={[{ label: '论坛', href: '/forum' }, { label: '发布内容' }]}
      />

      {/* 标题区 */}
      <section style={{ paddingTop: 16, paddingBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 32,
            lineHeight: 1.1,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
            margin: '0 0 8px',
          }}
        >
          发布内容
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0 }}>
          选择类型，撰写内容，与社区分享
        </p>
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 类型 tab */}
        <div className="flex items-center gap-2 flex-wrap">
          {POST_TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className="inline-flex items-center gap-2"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius)',
                  border: active
                    ? `1px solid ${t.color}`
                    : '1px solid var(--border)',
                  background: active ? t.color : 'transparent',
                  color: active ? 'var(--accent-blue-foreground)' : 'var(--muted-foreground)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 标题输入 */}
        <div>
          <label style={labelStyle} htmlFor="title">
            标题 <span style={{ color: 'var(--destructive)' }}>*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'topic'
                ? '一句话描述你的话题'
                : type === 'article'
                  ? '文章标题'
                  : '用一句话描述你的问题'
            }
            style={{
              ...inputStyle,
              fontSize: 16,
              padding: '12px 16px',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* 话题专属：分类 */}
        {type === 'topic' && (
          <div>
            <label style={labelStyle} htmlFor="category">
              分类
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {FORUM_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 文章专属：封面图 URL */}
        {type === 'article' && (
          <div>
            <label style={labelStyle} htmlFor="cover">
              封面图 URL（可选）
            </label>
            <input
              id="cover"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            {coverImage && (
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  aspectRatio: '16 / 9',
                  background: 'var(--muted)',
                }}
              >
                <img
                  src={coverImage}
                  alt="封面预览"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 问答专属：悬赏金额 */}
        {type === 'question' && (
          <div>
            <label style={labelStyle} htmlFor="bounty">
              悬赏金额（可选）
            </label>
            <input
              id="bounty"
              type="number"
              min={0}
              value={bounty}
              onChange={(e) => setBounty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              style={{ ...inputStyle, maxWidth: 200, fontFamily: 'var(--font-mono)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        )}

        {/* 内容编辑器 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="content">
              内容 <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setPreviewMode((v) => !v)}
              className="inline-flex items-center gap-1"
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: previewMode ? 'var(--muted)' : 'transparent',
                color: previewMode ? 'var(--accent-blue)' : 'var(--muted-foreground)',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.16s ease',
              }}
            >
              {previewMode ? (
                <>
                  <Edit size={12} />
                  编辑
                </>
              ) : (
                <>
                  <Eye size={12} />
                  预览
                </>
              )}
            </button>
          </div>
          {previewMode ? (
            <div
              style={{
                minHeight: 200,
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--card)',
              }}
            >
              {content.trim() ? (
                <MarkdownRenderer content={content} />
              ) : (
                <span style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
                  暂无内容可预览
                </span>
              )}
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="支持 Markdown 语法..."
              rows={12}
              style={{
                ...inputStyle,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                resize: 'vertical',
                lineHeight: 1.6,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          )}
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
            支持 Markdown 语法，可使用 **粗体**、*斜体*、`代码`、[链接](url) 等
          </div>
        </div>

        {/* 问答专属：补充说明 */}
        {type === 'question' && (
          <div>
            <label style={labelStyle} htmlFor="supplement">
              补充说明（可选）
            </label>
            <textarea
              id="supplement"
              value={supplement}
              onChange={(e) => setSupplement(e.target.value)}
              placeholder="补充更多细节，帮助回答者更好地理解你的问题"
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        )}

        {/* 标签输入（话题/文章/问答均可选） */}
        <div>
          <label style={labelStyle}>标签（可选）</label>
          {/* 已选标签 */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1"
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-blue-soft)',
                    color: 'var(--accent-blue)',
                    fontSize: 12,
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      lineHeight: 1,
                    }}
                    aria-label={`移除标签 ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* 标签输入 */}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="输入标签后按 Enter 添加..."
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          {/* 推荐标签 */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="inline-flex items-center gap-1"
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--muted-foreground)',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.color = 'var(--accent-blue)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--muted-foreground)';
                }}
              >
                <Plus size={10} />
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              color: 'var(--destructive)',
              fontSize: 14,
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-outline"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !content.trim() || submitting}
            className="btn-blue"
            style={{
              opacity: !title.trim() || !content.trim() || submitting ? 0.5 : 1,
              cursor: !title.trim() || !content.trim() || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {type === 'topic' ? '发布话题' : type === 'article' ? '发布文章' : '提交问题'}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
