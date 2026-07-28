import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Github, Sparkles, Package, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';

export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ success: boolean; access_token: string; refresh_token: string }>(
        '/auth/signin.php',
        { email, password, remember },
        { auth: false }
      );
      await login(data.access_token, data.refresh_token);
      const redirect = searchParams.get('redirect');
      if (redirect) {
        window.location.href = redirect;
      } else {
        navigate('/account/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('登录失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = () => {
    window.location.href = '/api/auth/github.php';
  };

  const features = [
    { icon: Sparkles, title: 'Mod 管理', desc: '一键安装、启用、禁用你的 Mod' },
    { icon: ImageIcon, title: '光影包管理', desc: '轻松切换光影，打造视觉盛宴' },
    { icon: Package, title: '整合包导入', desc: '支持 ZIP 整合包一键导入' },
  ];

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: 620 }}>
      {/* 品牌展示区 */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--brand-100) 0%, var(--brand-200) 100%)',
          padding: '64px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -120, right: -120, width: 320, height: 320, borderRadius: '50%', background: 'rgba(68, 118, 213, 0.08)' }} aria-hidden="true" />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 260, height: 260, borderRadius: '50%', background: 'rgba(68, 118, 213, 0.06)' }} aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 64,
              lineHeight: 1,
              color: 'var(--foreground)',
              letterSpacing: 'var(--tracking-tight)',
              marginBottom: 12,
            }}
          >
            Air
          </div>
          <div style={{ fontSize: 18, color: 'var(--muted-foreground)', marginBottom: 40 }}>
            为 iOS 打造的 Minecraft 启动器
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius)',
                    background: 'rgba(255, 255, 255, 0.75)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-blue)',
                    flexShrink: 0,
                  }}
                >
                  <f.icon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 登录表单区 */}
      <div
        style={{
          padding: '56px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <form style={{ width: '100%', maxWidth: 400 }} onSubmit={handleSubmit}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 32,
              lineHeight: 1.15,
              color: 'var(--foreground)',
              marginBottom: 8,
            }}
          >
            欢迎回来
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 32 }}>
            登录你的 Air 账户
          </p>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: 'var(--radius)',
                color: 'var(--destructive)',
                fontSize: 13,
                marginBottom: 20,
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* 邮箱 */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="signin-email" className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              邮箱
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  pointerEvents: 'none',
                  display: 'flex',
                }}
              >
                <Mail size={20} />
              </span>
              <input
                type="email"
                id="signin-email"
                className="form-input"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 42 }}
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* 密码 */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="signin-password" className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              密码
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  pointerEvents: 'none',
                  display: 'flex',
                }}
              >
                <Lock size={20} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="signin-password"
                className="form-input"
                placeholder="输入你的密码"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 42, paddingRight: 42 }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 'var(--radius-sm)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* 记住我 + 忘记密码 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <label
              className="form-checkbox"
              style={{ fontSize: 14, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
              />
              记住我
            </label>
            <Link to="/account/reset-password" style={{ fontSize: 14, color: 'var(--accent-blue)', fontWeight: 500 }}>
              忘记密码？
            </Link>
          </div>

          {/* 登录按钮 */}
          <button type="submit" className="btn-blue btn-block btn-lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>

          {/* 分隔线 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0',
              color: 'var(--muted-foreground)',
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            或
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* GitHub 登录 */}
          <button
            type="button"
            onClick={handleGithub}
            className="btn-outline btn-block btn-lg"
            disabled={loading}
          >
            <Github size={20} />
            使用 GitHub 登录
          </button>

          {/* 底部链接 */}
          <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--muted-foreground)' }}>
            还没有账户？
            <Link to="/account/sign-up" style={{ color: 'var(--accent-blue)', fontWeight: 500, marginLeft: 4 }}>
              立即注册
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
