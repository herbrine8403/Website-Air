import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Github,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';

type PasswordStrength = 'weak' | 'medium' | 'strong' | 'none';

function calcStrength(pwd: string): PasswordStrength {
  if (!pwd) return 'none';
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; bgColor: string; bars: number }> = {
  none: { label: '', color: 'var(--muted-foreground)', bgColor: 'var(--brand-300)', bars: 0 },
  weak: { label: '弱', color: 'var(--destructive)', bgColor: 'var(--destructive)', bars: 1 },
  medium: { label: '中', color: 'var(--color-warning)', bgColor: 'var(--color-warning)', bars: 2 },
  strong: { label: '强', color: 'var(--color-success)', bgColor: 'var(--color-success)', bars: 3 },
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bilibili, setBilibili] = useState('');
  const [agree, setAgree] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = calcStrength(password);
  const sConfig = strengthConfig[strength];
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!agree) {
      setError('请阅读并同意用户协议与隐私政策');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ success: boolean; access_token: string; refresh_token: string }>(
        '/auth/signup.php',
        {
          username,
          email,
          password,
          bilibili_username: bilibili || undefined,
        },
        { auth: false }
      );
      await login(data.access_token, data.refresh_token);
      navigate('/account/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('注册失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = () => {
    window.location.href = '/api/auth/github.php';
  };

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
              fontSize: 40,
              lineHeight: 1.1,
              color: 'var(--foreground)',
              letterSpacing: 'var(--tracking-tight)',
              marginBottom: 12,
            }}
          >
            加入 Air 社区
          </div>
          <div style={{ fontSize: 16, color: 'var(--muted-foreground)', marginBottom: 40, lineHeight: 1.6 }}>
            与 Minecraft 玩家一起探索 iOS Java 版的无限可能
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { value: '5K+', label: '活跃用户' },
              { value: '200+', label: '资源总数' },
              { value: '50+', label: '每日新增' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '18px 14px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--accent-blue)',
                    lineHeight: 1.2,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 注册表单区 */}
      <div
        style={{
          padding: '48px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <form style={{ width: '100%', maxWidth: 420 }} onSubmit={handleSubmit}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 30,
              lineHeight: 1.15,
              color: 'var(--foreground)',
              marginBottom: 8,
            }}
          >
            创建账户
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 28 }}>
            只需几步，开启你的旅程
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

          {/* 用户名 */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="signup-username" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              用户名<span style={{ color: 'var(--destructive)', marginLeft: 2 }}>*</span>
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
                <User size={20} />
              </span>
              <input
                type="text"
                id="signup-username"
                className="form-input"
                placeholder="输入用户名"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: 42 }}
                disabled={loading}
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                autoComplete="username"
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>
              3-20 个字符，仅限字母、数字和下划线
            </div>
          </div>

          {/* 邮箱 */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="signup-email" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              邮箱<span style={{ color: 'var(--destructive)', marginLeft: 2 }}>*</span>
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
                id="signup-email"
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
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="signup-password" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              密码<span style={{ color: 'var(--destructive)', marginLeft: 2 }}>*</span>
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
                id="signup-password"
                className="form-input"
                placeholder="设置密码"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: 42, paddingRight: 42 }}
                disabled={loading}
                autoComplete="new-password"
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
            {strength !== 'none' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        height: 4,
                        flex: 1,
                        borderRadius: 2,
                        background: i < sConfig.bars ? sConfig.bgColor : 'var(--brand-300)',
                        transition: 'background 0.2s ease',
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    minWidth: 28,
                    textAlign: 'right',
                    fontWeight: 500,
                    color: sConfig.color,
                  }}
                >
                  {sConfig.label}
                </span>
              </div>
            )}
          </div>

          {/* 确认密码 */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="signup-confirm" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              确认密码<span style={{ color: 'var(--destructive)', marginLeft: 2 }}>*</span>
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
                type={showConfirm ? 'text' : 'password'}
                id="signup-confirm"
                className="form-input"
                placeholder="再次输入密码"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: 42, paddingRight: 42 }}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? '隐藏密码' : '显示密码'}
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
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {passwordMismatch && (
              <div style={{ fontSize: 12, color: 'var(--destructive)', marginTop: 6 }}>
                两次输入的密码不一致
              </div>
            )}
            {!passwordMismatch && confirmPassword.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} />
                密码一致
              </div>
            )}
          </div>

          {/* Bilibili 用户名 */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="signup-bilibili" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              Bilibili 用户名
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 400 }}>（选填）</span>
            </label>
            <input
              type="text"
              id="signup-bilibili"
              className="form-input"
              placeholder="你的 Bilibili 用户名"
              value={bilibili}
              onChange={(e) => setBilibili(e.target.value)}
              disabled={loading}
            />
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>
              选填，用于关联你的 Bilibili 账户
            </div>
          </div>

          {/* 协议勾选 */}
          <div style={{ margin: '8px 0 24px' }}>
            <label
              className="form-checkbox"
              style={{
                fontSize: 13,
                color: 'var(--muted-foreground)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                cursor: 'pointer',
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)', marginTop: 2 }}
                required
              />
              <span>
                我已阅读并同意
                <a href="#" style={{ color: 'var(--accent-blue)', fontWeight: 500, marginLeft: 2 }}>《用户协议》</a>
                和
                <a href="#" style={{ color: 'var(--accent-blue)', fontWeight: 500, marginLeft: 2 }}>《隐私政策》</a>
              </span>
            </label>
          </div>

          {/* 创建账户按钮 */}
          <button type="submit" className="btn-blue btn-block btn-lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                创建中...
              </>
            ) : (
              '创建账户'
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

          {/* GitHub 注册 */}
          <button
            type="button"
            onClick={handleGithub}
            className="btn-outline btn-block btn-lg"
            disabled={loading}
          >
            <Github size={20} />
            使用 GitHub 注册
          </button>

          {/* 底部链接 */}
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--muted-foreground)' }}>
            已有账户？
            <Link to="/account/sign-in" style={{ color: 'var(--accent-blue)', fontWeight: 500, marginLeft: 4 }}>
              立即登录
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
