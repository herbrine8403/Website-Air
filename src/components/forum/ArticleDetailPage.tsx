import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  Reply,
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  Clock,
  Heart,
  Share2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { LoginPrompt } from '@/components/shared/LoginPrompt';
import { MarkdownRenderer } from '@/lib/markdown';
import {
  PageContainer,
  Breadcrumb,
  LoadingBlock,
  ErrorBlock,
  EmptyState,
  Avatar,
  VoteButton,
  FollowButton,
  formatNumber,
  formatRelativeTime,
  formatDate,
  buildReplyTree,
  type ArticleDetail,
  type Comment,
  type ReplyTreeNode,
  type ArticleDetailResponse,
} from './shared';

// 评论项（递归渲染楼中楼）
interface CommentItemProps {
  node: ReplyTreeNode<Comment>;
  floor: number;
  depth: number;
  onReply: (parentId: string | number, username: string) => void;
}

function CommentItem({ node, floor, depth, onReply }: CommentItemProps) {
  const comment = node.node;
  const marginLeft = Math.min(depth * 24, 72);

  return (
    <div style={{ marginLeft }}>
      <div
        className="flex items-start gap-3"
        style={{
          padding: '12px 0',
          borderBottom: depth === 0 ? '1px solid var(--border)' : 'none',
        }}
      >
        <Avatar author={comment.author} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
              {comment.author?.username || '匿名'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--muted-foreground)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--muted)',
              }}
            >
              #{floor}
            </span>
            <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <div className="mt-1.5 prose prose-sm max-w-none">
            <MarkdownRenderer content={comment.content} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            {comment.votes_count != null && (
              <VoteButton
                targetType="reply"
                targetId={comment.id}
                initialVotes={comment.votes_count}
                size="sm"
              />
            )}
            <button
              onClick={() => onReply(comment.id, comment.author?.username || '匿名')}
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 12,
                color: 'var(--muted-foreground)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                transition: 'color 0.16s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
            >
              <Reply size={12} />
              回复
            </button>
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {node.children.map((child, idx) => (
            <CommentItem
              key={child.node.id}
              node={child}
              floor={idx + 1}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArticleDetailPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const { user } = useAuth();

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string | number; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('缺少文章 ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<ArticleDetailResponse>(`/forum/article.php?id=${encodeURIComponent(id)}`);
        if (cancelled) return;
        setArticle(res.article ?? null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载文章详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleReplyTo = useCallback((parentId: string | number, username: string) => {
    setReplyTo({ id: parentId, username });
    setCommentContent('');
    const box = document.getElementById('comment-box');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSubmitComment = async () => {
    if (!user || !article || !commentContent.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/forum/reply.php', {
        target_type: 'article',
        target_id: article.id,
        content: commentContent.trim(),
        parent_id: replyTo?.id ?? null,
      });
      // 重新加载
      const res = await api.get<ArticleDetailResponse>(`/forum/article.php?id=${encodeURIComponent(String(article.id))}`);
      setArticle(res.article ?? null);
      setCommentContent('');
      setReplyTo(null);
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: article?.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('链接已复制');
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingBlock />
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

  if (!article) {
    return (
      <PageContainer>
        <EmptyState
          icon={<FileText size={32} />}
          title="文章不存在"
          desc="该文章可能已被删除"
          action={<Link to="/forum/articles" className="btn-outline">返回文章区</Link>}
        />
      </PageContainer>
    );
  }

  const commentTree = buildReplyTree(article.comments ?? []);
  // 估算字数和阅读时长
  const wordCount = article.content?.length || 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 400));

  const commentBox = (
    <div id="comment-box" style={{ marginTop: 32 }}>
      <h3
        className="flex items-center gap-2 mb-3"
        style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
      >
        <Reply size={18} style={{ color: 'var(--accent-blue)' }} />
        {replyTo ? `回复 @${replyTo.username}` : '发表评论'}
        {replyTo && (
          <button
            onClick={() => {
              setReplyTo(null);
              setCommentContent('');
            }}
            style={{
              fontSize: 12,
              color: 'var(--muted-foreground)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            取消回复
          </button>
        )}
      </h3>
      <textarea
        value={commentContent}
        onChange={(e) => setCommentContent(e.target.value)}
        placeholder="写下你的评论..."
        rows={4}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--foreground)',
          fontSize: 14,
          outline: 'none',
          resize: 'vertical',
          fontFamily: 'var(--font-sans)',
          transition: 'border-color 0.16s ease',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      />
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSubmitComment}
          disabled={!commentContent.trim() || submitting}
          className="btn-blue"
          style={{
            opacity: !commentContent.trim() || submitting ? 0.5 : 1,
            cursor: !commentContent.trim() || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          发布评论
        </button>
      </div>
    </div>
  );

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: '论坛', href: '/forum' },
          { label: '文章区', href: '/forum/articles' },
          { label: article.title },
        ]}
      />

      <Link
        to="/forum/articles"
        className="inline-flex items-center gap-1 mb-4"
        style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={14} />
        返回文章区
      </Link>

      {/* 文章头部 */}
      <article>
        {/* 封面图 */}
        {article.cover_image && (
          <div
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              marginBottom: 24,
              background: 'var(--muted)',
            }}
          >
            <img
              src={article.cover_image}
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* 标题 */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 36,
            lineHeight: 1.15,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
            margin: '0 0 16px',
          }}
        >
          {article.title}
        </h1>

        {/* 作者信息与元数据 */}
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{
            paddingBottom: 16,
            marginBottom: 24,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Avatar author={article.author} size={40} />
          <div className="flex flex-col">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
              {article.author?.username || '匿名'}
            </span>
            <span
              className="flex items-center gap-2"
              style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
            >
              <span>{formatDate(article.created_at)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {readTime} 分钟阅读
              </span>
            </span>
          </div>
          <div
            className="flex items-center gap-3 ml-auto"
            style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
          >
            <span className="inline-flex items-center gap-1">
              <Eye size={12} />
              {formatNumber(article.views_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Reply size={12} />
              {formatNumber(article.comments_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart size={12} />
              {formatNumber(article.likes_count)}
            </span>
          </div>
        </div>

        {/* 正文 */}
        <div className="prose prose-sm max-w-none" style={{ marginBottom: 32 }}>
          <MarkdownRenderer content={article.content} />
        </div>

        {/* 互动按钮 */}
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{
            padding: '16px 0',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            marginBottom: 32,
          }}
        >
          <VoteButton
            targetType="article"
            targetId={article.id}
            initialVotes={article.likes_count || 0}
          />
          <FollowButton targetType="article" targetId={article.id} label="收藏" />
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted-foreground)',
              fontSize: 13,
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
            <Share2 size={14} />
            分享
          </button>
        </div>
      </article>

      {/* 评论区 */}
      <section>
        <h2
          className="flex items-center gap-2 mb-4"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          <Reply size={18} style={{ color: 'var(--accent-blue)' }} />
          {article.comments_count || 0} 条评论
        </h2>
        {commentTree.length === 0 ? (
          <EmptyState
            icon={<Reply size={28} />}
            title="暂无评论"
            desc="快来发表第一条评论吧"
          />
        ) : (
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: '0 20px',
            }}
          >
            {commentTree.map((node, idx) => (
              <CommentItem
                key={node.node.id}
                node={node}
                floor={idx + 1}
                depth={0}
                onReply={handleReplyTo}
              />
            ))}
          </div>
        )}
      </section>

      {/* 评论框 */}
      {user ? (
        commentBox
      ) : (
        <div style={{ marginTop: 32 }}>
          <h3
            className="flex items-center gap-2 mb-3"
            style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
          >
            <Reply size={18} style={{ color: 'var(--accent-blue)' }} />
            发表评论
          </h3>
          <LoginPrompt
            trigger={
              <div
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius)',
                  border: '1px dashed var(--border-strong)',
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                登录后发表评论
              </div>
            }
            message="需要登录才能评论"
          />
        </div>
      )}
    </PageContainer>
  );
}
