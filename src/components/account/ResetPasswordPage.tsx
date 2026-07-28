import { KeyRound, ArrowLeft, Info } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <section
      style={{
        padding: '56px 24px 80px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '48px 40px',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--accent-blue-soft)',
            color: 'var(--accent-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <KeyRound size={34} />
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            lineHeight: 1.15,
            color: 'var(--foreground)',
            marginBottom: 10,
          }}
        >
          重置密码
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--muted-foreground)',
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          邮件服务暂未开通，如需重置密码请联系管理员
        </p>
        <div
          style={{
            marginTop: 20,
            padding: '14px 16px',
            background: 'var(--brand-50)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            color: 'var(--muted-foreground)',
            lineHeight: 1.6,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-blue)' }} />
          <span>请联系管理员通过后台或邮件协助你重置密码。</span>
        </div>
        <a href="/account/sign-in" className="btn-blue btn-block btn-lg" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ArrowLeft size={18} />
          返回登录
        </a>
      </div>
    </section>
  );
}
