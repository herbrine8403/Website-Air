import { MailCheck, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
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
          <MailCheck size={34} />
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
          验证邮箱
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--muted-foreground)',
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          邮件服务暂未开通，您的账户已自动验证
        </p>
        <a href="/account/dashboard" className="btn-blue btn-block btn-lg" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ArrowLeft size={18} />
          返回控制台
        </a>
      </div>
    </section>
  );
}
