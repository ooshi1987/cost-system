import Link from 'next/link';
import { isSignupEnabled } from '@/lib/auth';
import SignupForm from './SignupForm';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  if (isSignupEnabled()) return <SignupForm />;

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>新規登録は現在停止しています</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
          導入をご希望の方はお問い合わせください。アカウントをお持ちの方はログインしてください。
        </p>
        <Link href="/login" style={{ display: 'block', background: 'var(--accent)', color: '#fff', padding: '12px 0', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
          ログインへ
        </Link>
      </div>
    </div>
  );
}
