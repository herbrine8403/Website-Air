import { useEffect, useState, type FormEvent } from 'react';
import {
  User as UserIcon,
  Shield,
  Bell,
  Link2,
  Lock,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Check,
  Smartphone,
  Monitor,
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth, type AuthUser } from '@/hooks/useAuth';

type TabKey = 'account' | 'profile' | 'security' | 'sessions' | 'pats' | 'notifications' | 'delete';

interface SettingsData {
  username: string;
  email: string;
  email_verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  github_username: string | null;
  bilibili_username: string | null;
  notify_email_enabled: boolean;
}

interface Session {
  id: string;
  device?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet' | string;
  ip?: string;
  location?: string;
  last_active?: string;
  current?: boolean;
  user_agent?: string;
}

interface Pat {
  id: string;
  name: string;
  token_preview?: string;
  scopes?: string[];
  created_at?: string;
  last_used_at?: string | null;
  expires_at?: string | null;
}

function getInitials(name: string): string {
  if (!name) return 'U';
  return name.slice(0, 2).toUpperCase();
}

export default function SettingsPage() {
  const { user: authUser, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('account');

  const [profile, setProfile] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ success: boolean; settings?: SettingsData }>('/account/settings.php');
        if (!cancelled && res.settings) setProfile(res.settings);
        else if (!cancelled && authUser) {
          setProfile({
            username: authUser.username,
            email: authUser.email,
            email_verified: true,
            avatar_url: authUser.avatar_url,
            bio: authUser.bio,
            github_username: authUser.github_username,
            bilibili_username: authUser.bilibili_username,
            notify_email_enabled: false,
          });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError('加载设置失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={20} />
        加载中...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: 'var(--destructive)',
          }}
          role="alert"
        >
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: typeof UserIcon }[] = [
    { key: 'account', label: '账号', icon: UserIcon },
    { key: 'profile', label: '资料', icon: UserIcon },
    { key: 'security', label: '安全', icon: Shield },
    { key: 'sessions', label: '会话', icon: Smartphone },
    { key: 'pats', label: 'PATs', icon: Key },
    { key: 'notifications', label: '通知偏好', icon: Bell },
    { key: 'delete', label: '删除账号', icon: Trash2 },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-6 pt-10 pb-20">
      {/* 页面标题 */}
      <div className="mb-6">
        <div
          className="flex items-center gap-2 text-xs uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              display: 'inline-block',
            }}
          />
          Account
        </div>
        <h1
          className="mt-3"
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 40,
            lineHeight: 1.1,
            color: 'var(--foreground)',
            letterSpacing: 'var(--tracking-tight)',
          }}
        >
          账户设置
        </h1>
        <p className="mt-3 text-base" style={{ color: 'var(--muted-foreground)' }}>
          管理你的账户信息和安全设置
        </p>
      </div>

      <div className="grid gap-8" style={{ gridTemplateColumns: '240px 1fr' }}>
        {/* 侧边导航 */}
        <aside
          className="flex flex-col gap-1 p-3 rounded-xl self-start"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            position: 'sticky',
            top: 88,
          }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            const isDanger = t.key === 'delete';
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left"
                style={{
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  color: isActive
                    ? 'var(--accent-blue-foreground)'
                    : isDanger
                    ? 'var(--destructive)'
                    : 'var(--muted-foreground)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--muted)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </aside>

        {/* 右侧内容区 */}
        <div className="flex flex-col gap-8">
          {activeTab === 'account' && <AccountSection profile={profile} onUpdated={refresh} />}
          {activeTab === 'profile' && <ProfileSection profile={profile} onUpdated={refresh} />}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'sessions' && <SessionsSection />}
          {activeTab === 'pats' && <PatsSection />}
          {activeTab === 'notifications' && <NotificationsPrefSection profile={profile} />}
          {activeTab === 'delete' && <DeleteAccountSection />}
        </div>
      </div>
    </div>
  );
}

// ============== 通用小组件 ==============

function SectionCard({ title, desc, children, danger }: { title: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section
      className="rounded-xl p-6"
      style={{
        background: 'var(--card)',
        border: `1px solid var(--border)${danger ? '; border-left: 4px solid var(--destructive)' : ''}`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          color: danger ? 'var(--destructive)' : 'var(--foreground)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 4,
        }}
      >
        {title}
      </h2>
      {desc && (
        <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>
          {desc}
        </p>
      )}
      {children}
    </section>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--foreground)' }}>
      {children}
      {required && <span style={{ color: 'var(--destructive)', marginLeft: 2 }}>*</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 rounded-md text-sm"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-blue)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(68, 118, 213, 0.12)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3.5 py-2.5 rounded-md text-sm"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--background)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
        resize: 'vertical',
        minHeight: 100,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-blue)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(68, 118, 213, 0.12)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
    />
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className="relative flex-shrink-0"
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: on ? 'var(--accent-blue)' : 'var(--border)',
        transition: 'background-color 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          background: 'var(--color-white)',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-sm)',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
}

function ToggleRow({ title, desc, on, onChange, disabled, badge }: { title: string; desc: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          {title}
          {badge && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{desc}</div>
      </div>
      <Toggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex justify-end gap-3 mt-2 pt-5"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}

function Alert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const isErr = kind === 'error';
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-md text-sm mb-4"
      style={{
        background: isErr ? 'rgba(220, 38, 38, 0.08)' : 'rgba(22, 163, 74, 0.08)',
        border: `1px solid ${isErr ? 'rgba(220, 38, 38, 0.2)' : 'rgba(22, 163, 74, 0.2)'}`,
        color: isErr ? 'var(--destructive)' : 'var(--color-success)',
      }}
      role={isErr ? 'alert' : 'status'}
    >
      {isErr ? <AlertCircle size={16} /> : <Check size={16} />}
      <span>{children}</span>
    </div>
  );
}

function SaveButton({ loading, children = '保存更改' }: { loading: boolean; children?: React.ReactNode }) {
  return (
    <button type="submit" className="btn-blue" disabled={loading}>
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
      {loading ? '保存中...' : children}
    </button>
  );
}

// ============== 账号 Section ==============

function AccountSection({ profile, onUpdated }: { profile: SettingsData | null; onUpdated: () => Promise<void> }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [emailVerified] = useState(profile?.email_verified ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setEmail(profile.email);
    }
  }, [profile]);

  // 用户名唯一性校验（debounce）
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameStatus('idle');
      return;
    }
    if (username.length < 3 || username.length > 32) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ success: boolean; available?: boolean }>(
          `/auth/check-username.php?username=${encodeURIComponent(username)}`,
          { auth: false }
        );
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [username, profile?.username]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (username.length < 3 || username.length > 32) {
      setErr('用户名长度必须为 3-32 个字符');
      return;
    }
    if (usernameStatus === 'taken') {
      setErr('该用户名已被占用');
      return;
    }
    setSaving(true);
    try {
      await api.put('/account/settings.php', {
        username,
        email,
      });
      await onUpdated();
      setOk('账户信息已更新');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const usernameHint = () => {
    switch (usernameStatus) {
      case 'checking': return { text: '检查中...', color: 'var(--muted-foreground)' };
      case 'available': return { text: '✓ 用户名可用', color: 'var(--color-success)' };
      case 'taken': return { text: '✗ 用户名已被占用', color: 'var(--destructive)' };
      case 'invalid': return { text: '用户名长度需为 3-32 个字符', color: 'var(--muted-foreground)' };
      default: return { text: '3-32 个字符，可使用字母、数字、下划线', color: 'var(--muted-foreground)' };
    }
  };

  const hint = usernameHint();

  return (
    <SectionCard title="账号" desc="管理你的登录凭证">
      {err && <Alert kind="error">{err}</Alert>}
      {ok && <Alert kind="success">{ok}</Alert>}
      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <FieldLabel required>用户名</FieldLabel>
          <TextInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="输入用户名"
            disabled={saving}
          />
          <div className="text-xs mt-1.5" style={{ color: hint.color }}>{hint.text}</div>
        </div>
        <div className="mb-5">
          <FieldLabel>邮箱地址</FieldLabel>
          <div className="relative">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入邮箱"
              disabled={saving}
              style={{ paddingRight: emailVerified ? 90 : undefined }}
            />
            {emailVerified && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--color-success)',
                  color: 'var(--color-white)',
                }}
              >
                <Check size={12} />
                已验证
              </span>
            )}
          </div>
        </div>
        <ActionRow>
          <SaveButton loading={saving} />
        </ActionRow>
      </form>
    </SectionCard>
  );
}

// ============== 资料 Section ==============

function ProfileSection({ profile, onUpdated }: { profile: SettingsData | null; onUpdated: () => Promise<void> }) {
  const [bio, setBio] = useState(profile?.bio || '');
  const [github, setGithub] = useState(profile?.github_username || '');
  const [bilibili, setBilibili] = useState(profile?.bilibili_username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
      setGithub(profile.github_username || '');
      setBilibili(profile.bilibili_username || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (bio.length > 200) {
      setErr('简介最多 200 字');
      return;
    }
    setSaving(true);
    try {
      await api.put('/account/settings.php', {
        bio,
        github_username: github || null,
        bilibili_username: bilibili || null,
        avatar_url: avatarUrl || null,
      });
      await onUpdated();
      setOk('资料已更新');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="资料" desc="这些信息将展示在你的公开主页上">
      {err && <Alert kind="error">{err}</Alert>}
      {ok && <Alert kind="success">{ok}</Alert>}
      <form onSubmit={handleSubmit}>
        {/* 头像区 */}
        <div
          className="flex items-center gap-5 p-5 rounded-xl mb-6 flex-wrap"
          style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center font-bold flex-shrink-0"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'var(--accent-blue-soft)',
              color: 'var(--accent-blue)',
              fontSize: 24,
              border: '3px solid var(--background)',
              boxShadow: 'var(--shadow-sm)',
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!avatarUrl && getInitials(profile?.username || 'U')}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>更换头像</div>
            <div className="text-[13px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
              支持 JPG、PNG 格式，建议尺寸 256x256，文件不超过 2MB
            </div>
          </div>
          <button
            type="button"
            className="btn-outline"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => {
              const url = window.prompt('请输入头像图片 URL（演示用）：', avatarUrl);
              if (url !== null) setAvatarUrl(url);
            }}
          >
            选择文件
          </button>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <FieldLabel>GitHub 用户名</FieldLabel>
            <TextInput
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="GitHub 用户名"
              disabled={saving}
            />
          </div>
          <div>
            <FieldLabel>Bilibili 用户名</FieldLabel>
            <TextInput
              value={bilibili}
              onChange={(e) => setBilibili(e.target.value)}
              placeholder="Bilibili 用户名"
              disabled={saving}
            />
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel>个人简介</FieldLabel>
          <TextArea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="介绍一下自己吧"
            disabled={saving}
            maxLength={200}
          />
          <div className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
            最多 200 字，已使用 {bio.length} 字
          </div>
        </div>

        <ActionRow>
          <SaveButton loading={saving} />
        </ActionRow>
      </form>
    </SectionCard>
  );
}

// ============== 安全 Section ==============

function SecuritySection() {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [twoFactor, setTwoFactor] = useState(false);
  const [loginNotice, setLoginNotice] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!oldPwd || !newPwd || !confirmPwd) {
      setErr('请填写所有密码字段');
      return;
    }
    if (newPwd.length < 8) {
      setErr('新密码至少 8 个字符');
      return;
    }
    if (newPwd !== confirmPwd) {
      setErr('两次输入的新密码不一致');
      return;
    }
    setSaving(true);
    try {
      await api.post('/account/password.php', {
        old_password: oldPwd,
        new_password: newPwd,
      });
      setOk('密码已修改');
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '修改密码失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="安全" desc="保护你的账户安全">
        {err && <Alert kind="error">{err}</Alert>}
        {ok && <Alert kind="success">{ok}</Alert>}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <FieldLabel required>当前密码</FieldLabel>
            <PasswordInput value={oldPwd} onChange={setOldPwd} show={showOld} onToggle={() => setShowOld(!showOld)} disabled={saving} placeholder="输入当前密码" />
          </div>
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <FieldLabel required>新密码</FieldLabel>
              <PasswordInput value={newPwd} onChange={setNewPwd} show={showNew} onToggle={() => setShowNew(!showNew)} disabled={saving} placeholder="输入新密码" />
            </div>
            <div>
              <FieldLabel required>确认新密码</FieldLabel>
              <PasswordInput value={confirmPwd} onChange={setConfirmPwd} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} disabled={saving} placeholder="再次输入新密码" />
            </div>
          </div>

          <div className="mt-4">
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <ToggleRow
                title="两步验证"
                desc="登录时需要输入手机验证码，增强账户安全性"
                on={twoFactor}
                onChange={setTwoFactor}
                disabled
                badge="即将上线"
              />
              <ToggleRow
                title="登录通知"
                desc="新设备登录时发送邮件通知"
                on={loginNotice}
                onChange={setLoginNotice}
              />
            </div>
          </div>

          <ActionRow>
            <SaveButton loading={saving}>保存安全设置</SaveButton>
          </ActionRow>
        </form>
      </SectionCard>
    </>
  );
}

function PasswordInput({ value, onChange, show, onToggle, disabled, placeholder }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; disabled?: boolean; placeholder?: string }) {
  return (
    <div className="relative">
      <TextInput
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? '隐藏密码' : '显示密码'}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--muted-foreground)',
          padding: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
        }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

// ============== 会话 Section ==============

function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ success: boolean; sessions?: Session[] }>('/account/sessions.php');
      setSessions(res.sessions ?? []);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '加载会话列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRevoke = async (id: string) => {
    if (!window.confirm('确定要退出此设备的会话吗？')) return;
    setRevokingId(id);
    try {
      await api.delete(`/account/sessions.php?id=${encodeURIComponent(id)}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '退出会话失败');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <SectionCard title="会话" desc="以下是当前活跃的登录会话，可远程退出">
      {err && <Alert kind="error">{err}</Alert>}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <Loader2 className="animate-spin" size={16} />
          加载中...
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          暂无活跃会话
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3.5 p-3.5 rounded-xl"
              style={{ border: '1px solid var(--border)', background: 'var(--background)' }}
            >
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-blue-soft)',
                  color: 'var(--accent-blue)',
                }}
              >
                {s.device_type === 'mobile' ? <Smartphone size={20} /> : <Monitor size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2 flex-wrap" style={{ color: 'var(--foreground)' }}>
                  {s.device || s.user_agent || '未知设备'}
                  {s.current && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: 'var(--color-success)', color: 'var(--color-white)' }}
                    >
                      当前设备
                    </span>
                  )}
                </div>
                <div
                  className="mt-0.5 text-xs"
                  style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
                >
                  {[s.ip, s.location, s.last_active].filter(Boolean).join(' · ')}
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => handleRevoke(s.id)}
                  disabled={revokingId === s.id}
                  className="text-[13px] font-medium px-3 py-1.5 rounded-md"
                  style={{ color: 'var(--destructive)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(254, 242, 242, 0.8)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {revokingId === s.id ? '退出中...' : '退出登录'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ============== PATs Section ==============

function PatsSection() {
  const [pats, setPats] = useState<Pat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState('read');
  const [newExpiry, setNewExpiry] = useState('90');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ success: boolean; pats?: Pat[] }>('/account/pats.php');
      setPats(res.pats ?? []);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '加载令牌列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!newName.trim()) {
      setErr('请填写令牌名称');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<{ success: boolean; pat?: Pat; token?: string }>('/account/pats.php', {
        name: newName,
        scopes: newScopes.split(',').map((s) => s.trim()).filter(Boolean),
        expires_in_days: parseInt(newExpiry, 10) || 90,
      });
      if (res.token) {
        setNewToken(res.token);
        setCopied(false);
      }
      setNewName('');
      setShowCreate(false);
      await load();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '创建令牌失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此令牌吗？使用此令牌的应用将立即失去访问权限。')) return;
    try {
      await api.delete(`/account/pats.php?id=${encodeURIComponent(id)}`);
      setPats((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '删除令牌失败');
    }
  };

  const copyToken = () => {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <SectionCard title="个人访问令牌（PATs）" desc="创建可用于 API 访问的令牌">
      {err && <Alert kind="error">{err}</Alert>}

      {newToken && (
        <div
          className="p-4 rounded-md mb-4"
          style={{ background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.25)' }}
        >
          <div className="text-sm font-semibold mb-2" style={{ color: 'var(--color-success)' }}>
            令牌已创建 — 请立即复制保存
          </div>
          <div className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
            出于安全原因，此令牌仅显示一次。关闭后将无法再次查看。
          </div>
          <div className="flex gap-2 items-center">
            <code
              className="flex-1 px-3 py-2 rounded-md text-xs"
              style={{ background: 'var(--background)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}
            >
              {newToken}
            </code>
            <button type="button" onClick={copyToken} className="btn-outline" style={{ padding: '8px 14px', fontSize: 13 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制'}
            </button>
            <button type="button" onClick={() => setNewToken(null)} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }}>
              关闭
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowCreate((v) => !v)}
        className="btn-blue mb-4"
        style={{ padding: '8px 16px', fontSize: 13 }}
      >
        <Plus size={16} />
        {showCreate ? '取消创建' : '创建新令牌'}
      </button>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl mb-5"
          style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div>
              <FieldLabel required>令牌名称</FieldLabel>
              <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：CI 部署" disabled={creating} />
            </div>
            <div>
              <FieldLabel>权限范围</FieldLabel>
              <TextInput value={newScopes} onChange={(e) => setNewScopes(e.target.value)} placeholder="read,write" disabled={creating} />
            </div>
            <div>
              <FieldLabel>有效期（天）</FieldLabel>
              <TextInput type="number" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} disabled={creating} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="btn-blue" disabled={creating} style={{ padding: '8px 16px', fontSize: 13 }}>
              {creating ? <Loader2 className="animate-spin" size={14} /> : <Key size={14} />}
              {creating ? '创建中...' : '生成令牌'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <Loader2 className="animate-spin" size={16} />
          加载中...
        </div>
      ) : pats.length === 0 ? (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          暂无访问令牌
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pats.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3.5 p-3.5 rounded-xl"
              style={{ border: '1px solid var(--border)', background: 'var(--background)' }}
            >
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-blue-soft)',
                  color: 'var(--accent-blue)',
                }}
              >
                <Key size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {p.name}
                </div>
                <div className="text-xs mt-0.5 flex gap-3 flex-wrap" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
                  {p.token_preview && <span>{p.token_preview}</span>}
                  {p.created_at && <span>创建于 {new Date(p.created_at).toLocaleDateString('zh-CN')}</span>}
                  {p.last_used_at && <span>最近使用 {new Date(p.last_used_at).toLocaleDateString('zh-CN')}</span>}
                  {p.expires_at && <span>过期于 {new Date(p.expires_at).toLocaleDateString('zh-CN')}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="text-[13px] font-medium px-3 py-1.5 rounded-md"
                style={{ color: 'var(--destructive)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(254, 242, 242, 0.8)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ============== 通知偏好 Section ==============

function NotificationsPrefSection({ profile }: { profile: SettingsData | null }) {
  const [emailEnabled, setEmailEnabled] = useState(profile?.notify_email_enabled ?? false);
  const [resUpdates, setResUpdates] = useState(true);
  const [forumReplies, setForumReplies] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [announcements, setAnnouncements] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setEmailEnabled(profile.notify_email_enabled ?? false);
  }, [profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      await api.put('/account/settings.php', {
        notify_email_enabled: emailEnabled,
        notify_prefs: {
          resource_updates: resUpdates,
          forum_replies: forumReplies,
          mentions,
          announcements,
          weekly,
        },
      });
      setOk('通知偏好已保存');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="通知偏好" desc="选择你想要接收的通知类型（邮件发送逻辑即将上线）">
      {err && <Alert kind="error">{err}</Alert>}
      {ok && <Alert kind="success">{ok}</Alert>}
      <form onSubmit={handleSubmit}>
        <ToggleRow
          title="邮件通知总开关"
          desc="开启后，重要的通知将通过邮件发送到你的邮箱"
          on={emailEnabled}
          onChange={setEmailEnabled}
        />
        <div style={{ borderTop: 'none' }}>
          <ToggleRow title="资源更新通知" desc="你上传的资源有新评论或下载时通知你" on={resUpdates} onChange={setResUpdates} />
          <ToggleRow title="论坛回复通知" desc="有人回复你的主题或问答时通知你" on={forumReplies} onChange={setForumReplies} />
          <ToggleRow title="提及通知" desc="有人在帖子中 @你 时通知你" on={mentions} onChange={setMentions} />
          <ToggleRow title="公告通知" desc="接收 Air 启动器的重要公告和更新" on={announcements} onChange={setAnnouncements} />
          <ToggleRow title="邮件摘要" desc="每周汇总一次通知到你的邮箱" on={weekly} onChange={setWeekly} />
        </div>
        <ActionRow>
          <SaveButton loading={saving}>保存通知设置</SaveButton>
        </ActionRow>
      </form>
    </SectionCard>
  );
}

// ============== 删除账号 Section ==============

function DeleteAccountSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!password) {
      setErr('请输入你的密码以确认');
      return;
    }
    if (confirmText !== '删除我的账户') {
      setErr('请输入 "删除我的账户" 以二次确认');
      return;
    }
    setDeleting(true);
    try {
      await api.delete('/account/settings.php', {
        // 部分后端 DELETE 不支持 body，这里同时传 query
      });
      // 后端可能要求密码校验，尝试 POST 等价端点
      await api.post('/account/delete.php', { password });
      // 退出登录
      window.location.href = '/account/sign-in';
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : '删除账户失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SectionCard title="删除账号" desc="以下操作不可撤销，请谨慎执行" danger>
      {err && <Alert kind="error">{err}</Alert>}
      {!confirmOpen ? (
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <p className="text-sm flex-1 min-w-[240px]" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
            注销后，你的所有数据和资源将被永久删除，此操作不可撤销。包括你上传的资源、论坛帖子以及所有的关注关系都将被清除。
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="btn-blue"
            style={{ background: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
          >
            <Trash2 size={16} />
            注销账户
          </button>
        </div>
      ) : (
        <form onSubmit={handleDelete} className="p-5 rounded-xl" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
          <div className="text-sm font-semibold mb-2" style={{ color: 'var(--destructive)' }}>
            最终确认
          </div>
          <p className="text-[13px] mb-4" style={{ color: 'var(--muted-foreground)' }}>
            请输入你的账户密码，并在下方输入 <code style={{ background: 'var(--muted)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>删除我的账户</code> 以确认。
          </p>
          <div className="mb-4">
            <FieldLabel required>密码</FieldLabel>
            <PasswordInput value={password} onChange={setPassword} show={showPwd} onToggle={() => setShowPwd(!showPwd)} placeholder="输入你的密码" />
          </div>
          <div className="mb-5">
            <FieldLabel required>确认文本</FieldLabel>
            <TextInput
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="删除我的账户"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setPassword('');
                setConfirmText('');
                setErr(null);
              }}
              className="btn-ghost"
              disabled={deleting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-blue"
              style={{ background: 'var(--destructive)', color: 'var(--destructive-foreground)' }}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              {deleting ? '删除中...' : '永久删除账户'}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
