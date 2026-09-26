import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  Reply as ReplyIcon,
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
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
  getCategoryLabel,
  buildReplyTree,
  type TopicDetail,
  type Reply,
  type ReplyTreeNode,
  type TopicDetailResponse,
} from './shared';

// 楼层回复项（递归渲染楼中楼）
interface ReplyItemProps {
  node: ReplyTreeNode<Reply>;
  floor: number;
  depth: number;
  topicId: string | number;
  onReply: (parentId: string | number, username: string) => void;
}

function ReplyItem({ node, floor, depth, topicId, onReply }: ReplyItemProps) {
  const reply = node.node;
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
        <Avatar author={reply.author} size={32} />
        <div className="flex-1 min-w-0">
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ fontSize: 13 }}
          >
            <span
              style={{
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              {reply.author?.username || '匿名'}
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
              {formatRelativeTime(reply.created_at)}
            </span>
          </div>
          <div className="mt-1.5 prose prose-sm max-w-none">
            <MarkdownRenderer content={reply.content} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <VoteButton
              targetType="reply"
              targetId={reply.id}
              initialVotes={reply.votes_count || 0}
              size="sm"
            />
            <button
              onClick={() => onReply(reply.id, reply.author?.username || '匿名')}
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
              <ReplyIcon size={12} />
              回复
            </button>
          </div>
        </div>
      </div>
      {/* 楼中楼 */}
      {node.children.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {node.children.map((child, idx) => (
            <ReplyItem
              key={child.node.id}
              node={child}
              floor={idx + 1}
              depth={depth + 1}
              topicId={topicId}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopicDetailPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const { user } = useAuth();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 回复框状态
  const [replyContent, setReplyContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string | number; username: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('缺少话题 ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<TopicDetailResponse>(`/forum/topic.php?id=${encodeURIComponent(id)}`);
        if (cancelled) return;
        const t = res.topic ?? null;
        if (t && (res as any).replies) {
          (t as any).replies = (res as any).replies;
        }
        setTopic(t);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载话题详情失败');
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
    setReplyContent('');
    // 滚动到回复框
    const replyBox = document.getElementById('reply-box');
    if (replyBox) replyBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSubmitReply = async () => {
    if (!user) return;
    if (!replyContent.trim()) return;
    if (!topic) return;
    setSubmitting(true);
    try {
      await api.post('/forum/reply.php', {
        target_type: 'topic',
        target_id: topic.id,
        content: replyContent.trim(),
        parent_id: replyTo?.id ?? null,
      });
      // 重新加载话题
      const res = await api.get<TopicDetailResponse>(`/forum/topic.php?id=${encodeURIComponent(String(topic.id))}`);
      // 后端返回的 replies 与 topic 同级，需要合并
      const newTopic = res.topic ?? null;
      if (newTopic && (res as any).replies) {
        (newTopic as any).replies = (res as any).replies;
      }
      setTopic(newTopic);
      setReplyContent('');
      setReplyTo(null);
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('回复失败');
    } finally {
      setSubmitting(false);
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

  if (!topic) {
    return (
      <PageContainer>
        <EmptyState
          icon={<MessageSquare size={32} />}
          title="话题不存在"
          desc="该话题可能已被删除"
          action={<Link to="/forum/topics" className="btn-outline">返回讨论区</Link>}
        />
      </PageContainer>
    );
  }

  const replyTree = buildReplyTree(topic.replies ?? []);

  const replyBox = (
    <div id="reply-box" style={{ marginTop: 32 }}>
      <h3
        className="flex items-center gap-2 mb-3"
        style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
      >
        <ReplyIcon size={18} style={{ color: 'var(--accent-blue)' }} />
        {replyTo ? `回复 @${replyTo.username}` : '发表回复'}
        {replyTo && (
          <button
            onClick={() => {
              setReplyTo(null);
              setReplyContent('');
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
        value={replyContent}
        onChange={(e) => setReplyContent(e.target.value)}
        placeholder="写下你的回复..."
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
          onClick={handleSubmitReply}
          disabled={!replyContent.trim() || submitting}
          className="btn-blue"
          style={{
            opacity: !replyContent.trim() || submitting ? 0.5 : 1,
            cursor: !replyContent.trim() || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          发布回复
        </button>
      </div>
    </div>
  );

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: '论坛', href: '/forum' },
          { label: '讨论区', href: '/forum/topics' },
          { label: topic.title },
        ]}
      />

      <Link
        to="/forum/topics"
        className="inline-flex items-center gap-1 mb-4"
        style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={14} />
        返回讨论区
      </Link>

      {/* 主帖卡 */}
      <article
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-sm)',
          padding: 24,
          marginBottom: 32,
        }}
      >
        {/* 分类标签 */}
        {topic.category && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-blue-soft)',
              color: 'var(--accent-blue)',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            {getCategoryLabel(topic.category)}
          </span>
        )}
        {/* 标题 */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            lineHeight: 1.2,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
            margin: '0 0 16px',
          }}
        >
          {topic.title}
        </h1>
        {/* 作者信息 */}
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{ marginBottom: 16 }}
        >
          <Avatar author={topic.author} size={36} />
          <div className="flex flex-col">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
              {topic.author?.username || '匿名'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {formatDate(topic.created_at)} · {formatRelativeTime(topic.created_at)}
            </span>
          </div>
          <div
            className="flex items-center gap-3 ml-auto"
            style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
          >
            <span className="inline-flex items-center gap-1">
              <Eye size={12} />
              {formatNumber(topic.views_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ReplyIcon size={12} />
              {formatNumber(topic.replies_count)}
            </span>
          </div>
        </div>
        {/* 正文 */}
        <div className="mt-4 prose prose-sm max-w-none">
          <MarkdownRenderer content={topic.content} />
        </div>
        {/* 互动按钮 */}
        <div
          className="flex items-center gap-3 flex-wrap mt-6 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <VoteButton
            targetType="topic"
            targetId={topic.id}
            initialVotes={topic.followers_count || 0}
          />
          <FollowButton targetType="topic" targetId={topic.id} />
        </div>
      </article>

      {/* 回复流 */}
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
          <MessageSquare size={18} style={{ color: 'var(--accent-blue)' }} />
          {topic.replies_count || 0} 条回复
        </h2>
        {replyTree.length === 0 ? (
          <EmptyState
            icon={<ReplyIcon size={28} />}
            title="暂无回复"
            desc="快来发表第一条回复吧"
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
            {replyTree.map((node, idx) => (
              <ReplyItem
                key={node.node.id}
                node={node}
                floor={idx + 1}
                depth={0}
                topicId={topic.id}
                onReply={handleReplyTo}
              />
            ))}
          </div>
        )}
      </section>

      {/* 回复框 */}
      {user ? (
        replyBox
      ) : (
        <div style={{ marginTop: 32 }}>
          <h3
            className="flex items-center gap-2 mb-3"
            style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
          >
            <ReplyIcon size={18} style={{ color: 'var(--accent-blue)' }} />
            发表回复
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
                登录后发表回复
              </div>
            }
            message="需要登录才能回复"
          />
        </div>
      )}
    </PageContainer>
  );
}
