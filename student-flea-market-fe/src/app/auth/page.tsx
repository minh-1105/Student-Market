'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, LockKeyhole, User, AtSign, Phone, ArrowRight, UserCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { isStaff } from '@/lib/format';
import { useMitosis } from '@/components/MitosisTransition';
import { useLang, useT } from '@/lib/i18n';
import { LanguageSwitch } from '@/components/shell/Sidebar';
import { Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup' | 'verify';

/** Survives a reload so a half-finished sign-up lands back on the code step. */
const PENDING_KEY = 'sfm_pending_verify';
const readPending = () => {
  try {
    return typeof window === 'undefined' ? null : sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
};
const writePending = (email: string | null) => {
  try {
    if (email) sessionStorage.setItem(PENDING_KEY, email);
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
};
type Status = { tone: 'idle' | 'busy' | 'error' | 'success'; text: string };

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display leading-none tracking-tight text-neutral-900 select-none', className)}>
      F<span className="italic">L</span>ea
    </span>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: typeof Mail;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  pattern?: string;
  title?: string;
  password?: boolean;
}

function Field({ id, label, icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, pattern, title, password = false }: FieldProps) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-neutral-700 ml-1">
        {label}
      </label>
      <div className="relative flex items-center">
        <Icon className="absolute left-4 w-[18px] h-[18px] text-neutral-500 pointer-events-none" aria-hidden="true" />
        <input
          id={id}
          type={password ? (show ? 'text' : 'password') : type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          pattern={pattern}
          title={title}
          className={cn(
            'w-full bg-[#d6d6d6] focus:bg-[#d0d0d0] rounded-2xl py-3.5 pl-11 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-colors',
            'focus-visible:shadow-[0_0_0_2px_rgba(34,34,34,0.25)]',
            password ? 'pr-11' : 'pr-4'
          )}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? t('Ẩn mật khẩu', 'Hide password') : t('Hiện mật khẩu', 'Show password')}
            className="absolute right-4 p-0.5 text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            {show ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );
}

const darkBtn =
  'w-full bg-[#222] hover:bg-neutral-900 active:scale-[0.99] disabled:opacity-60 text-white py-3.5 rounded-2xl text-sm font-semibold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer';
const linkBtn = 'text-neutral-900 font-semibold underline underline-offset-4 decoration-neutral-400 hover:text-black cursor-pointer';

function AuthPortal() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect');
  const { login, register, verifyEmail, resendVerificationCode, isAuthenticated, isInitialized, initAuth, user } = useAuthStore();
  const hydrateLang = useLang((s) => s.hydrate);

  // AuthPortal renders only on the client (useSearchParams + Suspense), so reading storage here is safe.
  const [mode, setMode] = useState<Mode>(() => (params.get('mode') === 'register' ? 'signup' : readPending() ? 'verify' : 'signin'));
  const { phase, divideInto } = useMitosis();
  const [status, setStatus] = useState<Status | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    params.get('reason') === 'password-changed'
      ? t('Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.', 'Password changed. Please sign in with your new password.')
      : readPending() && params.get('mode') !== 'register'
      ? t(`Bạn đang xác minh ${readPending()}. Nhập mã 6 số hoặc bấm Gửi lại mã.`, `You are verifying ${readPending()}. Enter the 6-digit code or resend it.`)
      : null
  );

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [reg, setReg] = useState({ fullName: '', username: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
  const [verifyEmailAddr, setVerifyEmailAddr] = useState(() => readPending() ?? '');
  const [code, setCode] = useState('');

  useEffect(() => {
    initAuth();
    hydrateLang();
  }, [initAuth, hydrateLang]);

  const destination = (roleName?: string) =>
    redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : isStaff(roleName) ? '/admin' : '/';

  // Opened /auth while already signed in: go straight in, no animation.
  useEffect(() => {
    if (isInitialized && isAuthenticated && phase === 'idle') router.replace(destination(user?.roleName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isAuthenticated]);

  const run = async (busyText: string, fn: () => Promise<void>) => {
    setStatus({ tone: 'busy', text: busyText });
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setStatus({ tone: 'error', text: e instanceof Error ? e.message : t('Đã có lỗi xảy ra', 'Something went wrong') });
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStatus(null);
    setNotice(null);
  };

  const onSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    run(t('Đang xác thực…', 'Signing in…'), async () => {
      const r = await login(identifier.trim(), password, remember);
      setStatus({ tone: 'success', text: t(`Chào ${r.user.fullName}`, `Welcome ${r.user.fullName}`) });
      divideInto(destination(r.user.roleName));
    });
  };

  const onSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (reg.password !== reg.confirmPassword) {
      setStatus({ tone: 'error', text: t('Mật khẩu nhập lại không khớp', 'Passwords do not match') });
      return;
    }
    run(t('Đang tạo tài khoản…', 'Creating account…'), async () => {
      const r = await register({ ...reg, fullName: reg.fullName.trim(), username: reg.username.trim(), email: reg.email.trim() });
      const email = r.verificationEmail || reg.email.trim();
      writePending(email);
      setVerifyEmailAddr(email);
      setMode('verify');
      setStatus({ tone: 'success', text: t('Đã gửi mã xác minh', 'Verification code sent') });
      setNotice(t(`Nhập mã 6 số vừa gửi tới ${email}.`, `Enter the 6-digit code sent to ${email}.`));
    });
  };

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault();
    run(t('Đang xác minh…', 'Verifying…'), async () => {
      await verifyEmail(verifyEmailAddr.trim(), code.trim());
      writePending(null);
      setIdentifier(verifyEmailAddr.trim());
      setMode('signin');
      setStatus({ tone: 'success', text: t('Email đã xác minh', 'Email verified') });
      setNotice(t('Xác minh thành công. Đăng nhập để bắt đầu.', 'Verified! Sign in to get started.'));
    });
  };

  const onResend = () =>
    run(t('Đang gửi lại mã…', 'Resending code…'), async () => {
      await resendVerificationCode(verifyEmailAddr.trim());
      setStatus({ tone: 'success', text: t('Đã gửi lại mã', 'Code resent') });
    });

  const busy = status?.tone === 'busy' || phase !== 'idle';
  const dot = status?.tone === 'busy' ? 'bg-amber-400 animate-ping' : status?.tone === 'error' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse';
  const subtitle = mode === 'signin' ? t('Đăng nhập', 'Sign In') : mode === 'signup' ? t('Đăng ký', 'Sign Up') : t('Xác minh email', 'Verify email');

  return (
    <div className="auth-canvas min-h-screen flex flex-col justify-between overflow-x-hidden text-neutral-900" inert={phase !== 'idle'}>
      {/* Header: brand + dynamic status island + language */}
      <header className="w-full px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 relative z-50">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-white text-sm font-display font-bold shadow-sm">F</span>
          <span className="text-sm font-semibold tracking-wide text-neutral-800">FLea Marketplace</span>
          <span className="hidden md:inline-block px-2.5 py-0.5 text-[11px] font-medium bg-neutral-300/80 rounded-full text-neutral-700">
            {t('Dành cho sinh viên', 'For students')}
          </span>
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 backdrop-blur-sm min-w-0 max-w-[60vw] transition-colors',
              status?.tone === 'error' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-neutral-300/70 text-neutral-700'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} aria-hidden="true" />
            <span className="truncate">{status?.text ?? t('Màn hình xác thực', 'Authentication')}</span>
          </div>
          <LanguageSwitch />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 relative">
        {/* Auth card */}
        <section
          className={cn(
            'auth-card w-full max-w-[440px] bg-[#e5e5e5] rounded-[38px] p-8 sm:p-10 shadow-clay border border-white/60 flex flex-col relative',
            phase !== 'idle' && 'auth-card-dividing'
          )}
        >
          <div className="text-center pt-2 pb-5">
            <h1>
              <Wordmark className="text-[60px]" />
              <span className="sr-only"> – {subtitle}</span>
            </h1>
            <p className="font-display text-xl text-neutral-700 mt-2" aria-hidden="true">
              {subtitle}
            </p>
          </div>

          {mode !== 'verify' ? (
            <div className="flex items-center justify-center mb-6">
              <div role="tablist" aria-label={t('Chọn hình thức', 'Choose')} className="flex bg-[#d7d7d7] p-1 rounded-2xl w-full max-w-[300px] shadow-inset-subtle border border-black/5">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer',
                      mode === m ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                    )}
                  >
                    {m === 'signin' ? t('Đăng nhập', 'Sign In') : t('Đăng ký', 'Sign Up')}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => switchMode('signin')} className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 mb-4 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> {t('Về đăng nhập', 'Back to sign in')}
            </button>
          )}

          {notice && <p className="mb-4 px-4 py-3 rounded-2xl bg-white/70 border border-white text-xs text-neutral-700">{notice}</p>}

          <div key={mode} className="animate-in fade-in duration-300">
            {mode === 'signin' && (
              <>
                <form onSubmit={onSignIn} className="space-y-4">
                  <Field id="identifier" label={t('Email hoặc tên đăng nhập', 'Email or username')} icon={Mail} value={identifier} onChange={setIdentifier} placeholder={t('Nhập email của bạn', 'Enter your email')} autoComplete="username" />
                  <Field id="password" label={t('Mật khẩu', 'Password')} icon={Lock} value={password} onChange={setPassword} placeholder={t('Nhập mật khẩu', 'Enter your password')} autoComplete="current-password" password />
                  <div className="flex items-center justify-between gap-3 text-xs pt-1 pb-1">
                    <label className="flex items-center gap-2 text-neutral-700 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded-[4px] accent-neutral-900 cursor-pointer" />
                      {t('Ghi nhớ đăng nhập', 'Remember me')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyEmailAddr(identifier.includes('@') ? identifier.trim() : '');
                        switchMode('verify');
                      }}
                      className="text-neutral-700 hover:text-neutral-950 underline underline-offset-4 decoration-neutral-400 cursor-pointer"
                    >
                      {t('Chưa xác minh email?', 'Email not verified?')}
                    </button>
                  </div>
                  <button type="submit" disabled={busy} className={darkBtn}>
                    {status?.tone === 'busy' && <Spinner className="w-4 h-4 border-white/30 border-t-white" />}
                    {t('Đăng nhập', 'Sign In')}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
                <p className="text-center text-xs text-neutral-600 mt-7">
                  {t('Chưa có tài khoản?', 'Don’t have an account?')}{' '}
                  <button type="button" onClick={() => switchMode('signup')} className={linkBtn}>
                    {t('Đăng ký', 'Sign Up')}
                  </button>
                </p>
              </>
            )}

            {mode === 'signup' && (
              <>
                <form onSubmit={onSignUp} className="space-y-3.5">
                  <Field id="fullName" label={t('Họ và tên', 'Name')} icon={User} value={reg.fullName} onChange={(v) => setReg({ ...reg, fullName: v })} placeholder={t('Nhập họ tên', 'Enter your name')} autoComplete="name" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Field
                      id="username"
                      label={t('Tên đăng nhập', 'Username')}
                      icon={AtSign}
                      value={reg.username}
                      onChange={(v) => setReg({ ...reg, username: v })}
                      autoComplete="username"
                      pattern="[A-Za-z0-9._]{3,30}"
                      title={t('3–30 ký tự: chữ, số, dấu chấm, gạch dưới', '3–30 characters: letters, numbers, dots, underscores')}
                    />
                    <Field id="phone" label={t('Số điện thoại', 'Phone')} icon={Phone} type="tel" value={reg.phoneNumber} onChange={(v) => setReg({ ...reg, phoneNumber: v })} autoComplete="tel" pattern="\+?[0-9]{9,15}" />
                  </div>
                  <Field id="email" label="Email" icon={Mail} type="email" value={reg.email} onChange={(v) => setReg({ ...reg, email: v })} placeholder={t('Nhập email của bạn', 'Enter your email')} autoComplete="email" />
                  <Field id="signup-pass1" label={t('Mật khẩu', 'Password')} icon={Lock} value={reg.password} onChange={(v) => setReg({ ...reg, password: v })} placeholder={t('≥ 6 ký tự, có chữ và số', '6+ characters, letters and numbers')} autoComplete="new-password" password />
                  <Field id="signup-pass2" label={t('Nhập lại mật khẩu', 'Confirm Password')} icon={LockKeyhole} value={reg.confirmPassword} onChange={(v) => setReg({ ...reg, confirmPassword: v })} placeholder={t('Nhập lại mật khẩu', 'Confirm your password')} autoComplete="new-password" password />
                  <button type="submit" disabled={busy} className={cn(darkBtn, 'mt-2')}>
                    {status?.tone === 'busy' && <Spinner className="w-4 h-4 border-white/30 border-t-white" />}
                    {t('Tạo tài khoản', 'Create Account')}
                    <UserCheck className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
                <p className="text-center text-[11px] text-neutral-600 mt-4">
                  {t('Khi đăng ký, bạn đồng ý với', 'By signing up you agree to the')}{' '}
                  <Link href="/policies/term-of-service" className="underline underline-offset-2 hover:text-black">{t('Điều khoản', 'Terms')}</Link>{' '}
                  {t('và', 'and')}{' '}
                  <Link href="/policies/privacy-policy" className="underline underline-offset-2 hover:text-black">{t('Chính sách bảo mật', 'Privacy Policy')}</Link>.
                </p>
                <p className="text-center text-xs text-neutral-600 mt-4">
                  {t('Đã có tài khoản?', 'Already have an account?')}{' '}
                  <button type="button" onClick={() => switchMode('signin')} className={linkBtn}>
                    {t('Đăng nhập', 'Sign In')}
                  </button>
                </p>
              </>
            )}

            {mode === 'verify' && (
              <form onSubmit={onVerify} className="space-y-4">
                <Field id="verify-email" label="Email" icon={Mail} type="email" value={verifyEmailAddr} onChange={setVerifyEmailAddr} autoComplete="email" />
                <div className="space-y-1.5">
                  <label htmlFor="code" className="block text-[13px] font-medium text-neutral-700 ml-1">{t('Mã xác minh 6 số', '6-digit code')}</label>
                  <div className="relative flex items-center">
                    <ShieldCheck className="absolute left-4 w-[18px] h-[18px] text-neutral-500 pointer-events-none" aria-hidden="true" />
                    <input
                      id="code"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#d6d6d6] focus:bg-[#d0d0d0] rounded-2xl py-3.5 pl-11 pr-4 text-xl font-bold tracking-[0.5em] text-neutral-900 outline-none tabular focus-visible:shadow-[0_0_0_2px_rgba(34,34,34,0.25)]"
                    />
                  </div>
                </div>
                <button type="submit" disabled={busy} className={darkBtn}>
                  {t('Xác minh', 'Verify')} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onResend}
                  disabled={!verifyEmailAddr || busy}
                  className="w-full bg-[#f3f3f3] hover:bg-white disabled:opacity-60 text-neutral-800 py-3.5 rounded-2xl text-xs font-semibold shadow-clay-subtle border border-white/60 transition-all cursor-pointer"
                >
                  {t('Gửi lại mã', 'Resend code')}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="w-full text-center py-4 px-4 text-xs text-neutral-600">
        © 2026 FLea · {t('Chợ đồ cũ dành cho học sinh, sinh viên.', 'The second-hand market for students.')}
      </footer>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPortal />
    </Suspense>
  );
}
