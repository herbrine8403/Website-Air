import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { setTokens, getAccessToken, decodeJwt } from '@/lib/auth';

type CallbackState =
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string; githubId?: string; githubUsername?: string }
  | { kind: 'email_required'; githubId?: string; githubUsername?: string };

function getParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function CallbackInner() {
  const { login } = useAuth();
  const [state, setState] = useState<CallbackState>({ kind: 'loading' });
  const [linking, setLinking] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkSubmitted, setLinkSubmitted] = useState(false);

  useEffect(() => {
    const token = getParam('token');
    const refreshToken = getParam('refresh_token');
    const error = getParam('error');
    const githubId = getParam('github_id') || undefined;
    const githubUsername = getParam('github_username') || undefined;

    if (token) {
      // 先手动保存 token（确保 Cookie 和 localStorage 都有值）
      // 然后再调用 login()，login() 内部会调用 fetchMe() 验证 token 是否有效
      setTokens(token, refreshToken || '');

      // 验证 token 是否有效（解码 JWT 检查是否过期）
      const payload = decodeJwt(token);
      if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) {
        setState({ kind: 'error', message: '登录凭证已过期，请重新登录' });
        return;
      }

      login(token, refreshToken || '')
        .then(() => {
          // 验证 login() 是否成功保存了 token
          const savedToken = getAccessToken();
          if (!savedToken) {
            setState({ kind: 'error', message: '登录凭证保存失败，请重试' });
            return;
          }
          setState({ kind: 'success' });
          setTimeout(() => {
            window.location.href = '/account.html#/account/dashboard';
          }, 300);
        })
        .catch(() => {
          // login() 失败可能是因为 fetchMe() 返回 401
          // 但 token 已经保存了，所以不要显示错误，而是跳转到 dashboard 让 useAuth 自行处理
          // 或者显示一个更友好的错误信息
          setState({ kind: 'error', message: '登录验证失败，请重试或联系管理员' });
        });
      return;
    }

    if (error) {
      if (error === 'email_required') {
        setState({ kind: 'email_required', githubId, githubUsername });
      } else {
        const errorMap: Record<string, string> = {
          invalid_state: 'OAuth state 校验失败，请重新登录',
          github_error: 'GitHub 授权失败，请重试',
          github_token_failed: 'GitHub 令牌交换失败',
          github_user_failed: '获取 GitHub 用户信息失败',
          user_creation_failed: '账户创建失败',
          jwt_failed: '登录凭证签发失败',
        };
        setState({ kind: 'error', message: errorMap[error] || `登录失败：${error}`, githubId, githubUsername });
      }
      return;
    }

    setState({ kind: 'error', message: '回调参数缺失' });
  }, [login]);

  const handleLinkEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!linkEmail.trim()) return;
    setLinking(true);
    try {
      await api.post('/auth/github-link-email.php', {
        email: linkEmail.trim(),
        github_id: state.kind === 'email_required' ? state.githubId : undefined,
        github_username: state.kind === 'email_required' ? state.githubUsername : undefined,
      }, { auth: false });
    } catch {
      // 忽略
    } finally {
      setLinking(false);
      setLinkSubmitted(true);
    }
  };

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <main className="text-center px-6">
          <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: 'var(--accent-blue)' }} />
          <h1 className="mt-4 text-xl font-semibold">正在处理登录...</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>请稍候，即将跳转</p>
        </main>
      </div>
    );
  }

  if (state.kind === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <main className="text-center px-6">
          <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: 'var(--accent-blue)' }} />
          <h1 className="mt-4 text-xl font-semibold">登录成功</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>正在跳转到控制台...</p>
        </main>
      </div>
    );
  }

  if (state.kind === 'email_required') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <main className="w-full max-w-[440px] card" style={{ padding: '40px 32px' }}>
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--accent-blue-soft)',
              color: 'var(--accent-blue)',
              marginBottom: 24,
            }}
          >
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-center" style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 10 }}>
            补充邮箱
          </h1>
          <p className="text-center text-sm" style={{ color: 'var(--muted-foreground)', marginBottom: 28, lineHeight: 1.6 }}>
            你的 GitHub 账户{state.githubUsername ? `（@${state.githubUsername}）` : ''}未公开邮箱，<br />
            请补充一个邮箱以完成账户创建
          </p>

          {linkSubmitted ? (
            <div
              className="rounded text-sm"
              style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                padding: '14px 16px',
                color: 'var(--foreground)',
                lineHeight: 1.6,
              }}
            >
              已收到你的邮箱，请联系管理员完成账户绑定后重试登录。
            </div>
          ) : (
            <form onSubmit={handleLinkEmail}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="link-email" className="form-label">邮箱</label>
                <input
                  id="link-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="you@example.com"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  disabled={linking}
                />
              </div>
              <button
                type="submit"
                className="btn-blue btn-block"
                disabled={linking || !linkEmail.trim()}
              >
                {linking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '提交'
                )}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <a href="/account.html#/account/sign-in" className="text-sm" style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>
              返回登录
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <main className="w-full max-w-[440px] card" style={{ padding: '40px 32px' }}>
        <div
          className="mx-auto flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(220, 38, 38, 0.1)',
            color: 'var(--destructive)',
            marginBottom: 24,
          }}
        >
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-center" style={{ fontFamily: 'var(--font-serif)', fontSize: 28, marginBottom: 10 }}>
          登录失败
        </h1>
        <p className="text-center text-sm" style={{ color: 'var(--muted-foreground)', marginBottom: 28, lineHeight: 1.6 }}>
          {state.message}
        </p>
        <a href="/account.html#/account/sign-in" className="btn-blue btn-block">
          返回登录
        </a>
      </main>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <AuthProvider>
      <CallbackInner />
    </AuthProvider>
  );
}
