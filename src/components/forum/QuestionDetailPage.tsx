import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  Reply,
  ArrowLeft,
  Send,
  Loader2,
  HelpCircle,
  Coins,
  Check,
  CheckCircle,
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
  type QuestionDetail,
  type Answer,
  type QuestionDetailResponse,
} from './shared';

// 回答项
interface AnswerItemProps {
  answer: Answer;
  floor: number;
  isAccepted: boolean;
  canAccept: boolean;
  onAccept: (answerId: string | number) => void;
  accepting: boolean;
}

function AnswerItem({ answer, floor, isAccepted, canAccept, onAccept, accepting }: AnswerItemProps) {
  return (
    <div
      style={{
        padding: 16,
        marginBottom: 12,
        borderRadius: 'var(--radius)',
        border: isAccepted
          ? '2px solid var(--color-success)'
          : '1px solid var(--border)',
        background: isAccepted
          ? 'var(--color-success-soft, rgba(22, 163, 74, 0.04))'
          : 'var(--card)',
        boxShadow: isAccepted ? 'none' : 'var(--shadow-sm)',
      }}
    >
      {/* 已采纳标签 */}
      {isAccepted && (
        <div
          className="inline-flex items-center gap-1 mb-3"
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-success)',
            color: 'var(--accent-blue-foreground)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <CheckCircle size={12} />
          已采纳
        </div>
      )}
      {/* 作者信息 */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar author={answer.author} size={32} />
        <div className="flex flex-col">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
            {answer.author?.username || '匿名'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            {formatRelativeTime(answer.created_at)}
          </span>
        </div>
        <span
          style={{
            marginLeft: 'auto',
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
      </div>
      {/* 内容 */}
      <div className="prose prose-sm max-w-none">
        <MarkdownRenderer content={answer.content} />
      </div>
      {/* 互动区 */}
      <div
        className="flex items-center gap-3 flex-wrap mt-4 pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <VoteButton
          targetType="answer"
          targetId={answer.id}
          initialVotes={answer.votes_count || 0}
          size="sm"
        />
        {/* 采纳按钮（仅提问者可见且未采纳时） */}
        {canAccept && !isAccepted && (
          <button
            onClick={() => onAccept(answer.id)}
            disabled={accepting}
            className="inline-flex items-center gap-2"
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-success)',
              background: 'transparent',
              color: 'var(--color-success)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.16s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-success)';
              e.currentTarget.style.color = 'var(--accent-blue-foreground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-success)';
            }}
          >
            {accepting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            采纳
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuestionDetailPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const { user } = useAuth();

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!id) {
      setError('缺少问题 ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<QuestionDetailResponse>(`/forum/question.php?id=${encodeURIComponent(id)}`);
        if (cancelled) return;
        setQuestion(res.question ?? null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载问题详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmitAnswer = async () => {
    if (!user || !question || !answerContent.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/forum/answer.php', {
        question_id: question.id,
        content: answerContent.trim(),
      });
      // 重新加载
      const res = await api.get<QuestionDetailResponse>(`/forum/question.php?id=${encodeURIComponent(String(question.id))}`);
      setQuestion(res.question ?? null);
      setAnswerContent('');
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
      else alert('回答失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = useCallback(
    async (answerId: string | number) => {
      if (!question || !user) return;
      setAcceptingId(answerId);
      try {
        await api.post('/forum/accept-answer.php', { answer_id: answerId });
        // 重新加载
        const res = await api.get<QuestionDetailResponse>(`/forum/question.php?id=${encodeURIComponent(String(question.id))}`);
        setQuestion(res.question ?? null);
      } catch (err) {
        if (err instanceof ApiError) alert(err.message);
        else alert('采纳失败');
      } finally {
        setAcceptingId(null);
      }
    },
    [question, user]
  );

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

  if (!question) {
    return (
      <PageContainer>
        <EmptyState
          icon={<HelpCircle size={32} />}
          title="问题不存在"
          desc="该问题可能已被删除"
          action={<Link to="/forum/questions" className="btn-outline">返回问答区</Link>}
        />
      </PageContainer>
    );
  }

  // 判断当前用户是否为提问者
  const isAuthor = user && String(user.id) === String(question.author.id);
  // 已采纳的回答
  const acceptedAnswer = question.accepted_answer;
  // 其余回答
  const otherAnswers = (question.answers ?? []).filter(
    (a) => !acceptedAnswer || String(a.id) !== String(acceptedAnswer.id)
  );

  const answerBox = (
    <div id="answer-box" style={{ marginTop: 32 }}>
      <h3
        className="flex items-center gap-2 mb-3"
        style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
      >
        <Reply size={18} style={{ color: 'var(--accent-blue)' }} />
        你的回答
      </h3>
      <textarea
        value={answerContent}
        onChange={(e) => setAnswerContent(e.target.value)}
        placeholder="写下你的回答..."
        rows={6}
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
          onClick={handleSubmitAnswer}
          disabled={!answerContent.trim() || submitting}
          className="btn-blue"
          style={{
            opacity: !answerContent.trim() || submitting ? 0.5 : 1,
            cursor: !answerContent.trim() || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          发布回答
        </button>
      </div>
    </div>
  );

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: '论坛', href: '/forum' },
          { label: '问答区', href: '/forum/questions' },
          { label: question.title },
        ]}
      />

      <Link
        to="/forum/questions"
        className="inline-flex items-center gap-1 mb-4"
        style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={14} />
        返回问答区
      </Link>

      {/* 问题区 */}
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
        {/* 状态标签 */}
        <div className="flex items-center gap-2 mb-3">
          {question.is_solved && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                padding: '2px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-success)',
                color: 'var(--accent-blue-foreground)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <CheckCircle size={12} />
              已解决
            </span>
          )}
          {question.bounty != null && question.bounty > 0 && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                padding: '2px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-warning-soft, rgba(234, 88, 12, 0.1))',
                color: 'var(--color-warning)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Coins size={12} />
              悬赏 {question.bounty}
            </span>
          )}
        </div>
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
          {question.title}
        </h1>
        {/* 作者信息 */}
        <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 16 }}>
          <Avatar author={question.author} size={36} />
          <div className="flex flex-col">
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>
              {question.author?.username || '匿名'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              {formatDate(question.created_at)} · {formatRelativeTime(question.created_at)}
            </span>
          </div>
          <div
            className="flex items-center gap-3 ml-auto"
            style={{ fontSize: 12, color: 'var(--muted-foreground)' }}
          >
            <span className="inline-flex items-center gap-1">
              <Eye size={12} />
              {formatNumber(question.views_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Reply size={12} />
              {formatNumber(question.answers_count)}
            </span>
          </div>
        </div>
        {/* 正文 */}
        <div className="mt-4 prose prose-sm max-w-none">
          <MarkdownRenderer content={question.content} />
        </div>
        {/* 补充说明 */}
        {question.supplement && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--muted)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--muted-foreground)',
                marginBottom: 6,
              }}
            >
              补充说明
            </div>
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={question.supplement} />
            </div>
          </div>
        )}
        {/* 互动按钮 */}
        <div
          className="flex items-center gap-3 flex-wrap mt-6 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <VoteButton
            targetType="question"
            targetId={question.id}
            initialVotes={0}
          />
          <FollowButton targetType="question" targetId={question.id} />
        </div>
      </article>

      {/* 已采纳的回答 */}
      {acceptedAnswer && (
        <section style={{ marginBottom: 24 }}>
          <h2
            className="flex items-center gap-2 mb-4"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              color: 'var(--color-success)',
              letterSpacing: 'var(--tracking-tight)',
            }}
          >
            <CheckCircle size={18} />
            最佳答案
          </h2>
          <AnswerItem
            answer={acceptedAnswer}
            floor={0}
            isAccepted={true}
            canAccept={!!isAuthor}
            onAccept={handleAccept}
            accepting={acceptingId === acceptedAnswer.id}
          />
        </section>
      )}

      {/* 回答列表 */}
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
          {question.answers_count || 0} 个回答
        </h2>
        {otherAnswers.length === 0 && !acceptedAnswer ? (
          <EmptyState
            icon={<Reply size={28} />}
            title="暂无回答"
            desc="快来发表第一个回答吧"
          />
        ) : (
          <div>
            {otherAnswers.map((answer, idx) => (
              <AnswerItem
                key={answer.id}
                answer={answer}
                floor={idx + 1}
                isAccepted={false}
                canAccept={!!isAuthor}
                onAccept={handleAccept}
                accepting={acceptingId === answer.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* 回答框 */}
      {user ? (
        answerBox
      ) : (
        <div style={{ marginTop: 32 }}>
          <h3
            className="flex items-center gap-2 mb-3"
            style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}
          >
            <Reply size={18} style={{ color: 'var(--accent-blue)' }} />
            你的回答
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
                登录后发表回答
              </div>
            }
            message="需要登录才能回答"
          />
        </div>
      )}
    </PageContainer>
  );
}
