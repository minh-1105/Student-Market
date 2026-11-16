'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Camera, Check, Eye, EyeOff, GraduationCap, KeyRound, Mail, MapPin, Save, Trash2, UserRound } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { PageHeader, Notice, Avatar, Spinner } from '@/components/ui';
import { profileApi, apiError, validateAvatar, waitForImage, AVATAR_TYPES } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLang, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { UserDto } from '@/types/auth';

type ProfileForm = {
  fullName: string;
  phoneNumber: string;
  schoolName: string;
  studentCode: string;
  commonArea: string;
  dormitory: string;
};

const toForm = (u: UserDto): ProfileForm => ({
  fullName: u.fullName ?? '',
  phoneNumber: u.phoneNumber ?? '',
  schoolName: u.schoolName ?? '',
  studentCode: u.studentCode ?? '',
  commonArea: u.commonArea ?? '',
  dormitory: u.dormitory ?? '',
});

const PHONE_RE = /^\+?[0-9]{9,15}$/;

// ---------------------------------------------------------------- building blocks
function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold text-neutral-900">{title}</h2>
          {description && <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  ...input
}: { id: string; label: string; hint?: string; error?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-help` : undefined} {...input} />
      {(error || hint) && (
        <p id={`${id}-help`} className={cn('text-[11px] mt-1.5 ml-1', error ? 'text-[#93000a]' : 'text-neutral-500')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  error?: string | null;
}) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="field pr-12"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-help` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t('Ẩn mật khẩu', 'Hide password') : t('Hiện mật khẩu', 'Show password')}
          aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 cursor-pointer"
        >
          {show ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-help`} className="text-[11px] mt-1.5 ml-1 text-[#93000a]">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- avatar (S3)
function AvatarEditor({ user, onChange }: { user: UserDto; onChange: (u: UserDto) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Free the object URL when the preview is replaced or the page unmounts.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateAvatar(file);
    if (invalid) {
      setStatus({ tone: 'error', text: invalid });
      return;
    }
    setPreview(URL.createObjectURL(file));
    setBusy('upload');
    setStatus(null);
    try {
      const updated = await profileApi.uploadAvatar(file);
      // The Lambda needs a moment to crop + convert; keep the local preview until the CDN copy exists.
      const ready = updated.avatarUrl ? await waitForImage(updated.avatarUrl) : true;
      onChange(updated);
      if (ready) {
        setPreview(null);
        setStatus({ tone: 'success', text: t('Đã cập nhật ảnh đại diện.', 'Profile photo updated.') });
      } else {
        setStatus({ tone: 'info', text: t('Ảnh đã lưu, đang được xử lý — sẽ hiển thị sau ít giây.', 'Saved — still processing, it will appear in a few seconds.') });
      }
    } catch (err) {
      setPreview(null);
      setStatus({ tone: 'error', text: apiError(err, t('Không tải được ảnh lên.', 'Could not upload the photo.')) });
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy('remove');
    setStatus(null);
    try {
      onChange(await profileApi.removeAvatar());
      setPreview(null);
    } catch (err) {
      setStatus({ tone: 'error', text: apiError(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-start sm:items-center gap-2 shrink-0">
      <div className="relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover bg-neutral-200" />
        ) : (
          <Avatar name={user.fullName} url={user.avatarUrl} size="xl" />
        )}
        {busy === 'upload' && (
          <span className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center">
            <Spinner className="w-6 h-6 border-white/40 border-t-white" />
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!!busy}
          aria-label={t('Đổi ảnh đại diện', 'Change profile photo')}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-neutral-200 shadow-md flex items-center justify-center text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors cursor-pointer disabled:opacity-60"
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {user.avatarUrl && !preview && (
        <button
          type="button"
          onClick={remove}
          disabled={!!busy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-[#93000a] cursor-pointer disabled:opacity-60"
        >
          {busy === 'remove' ? <Spinner className="w-3 h-3" /> : <Trash2 className="w-3 h-3" aria-hidden="true" />} {t('Gỡ ảnh', 'Remove')}
        </button>
      )}
      {status ? (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'text-[11px] max-w-[11rem] sm:text-center leading-snug',
            status.tone === 'error' ? 'text-[#93000a]' : status.tone === 'success' ? 'text-emerald-700' : 'text-neutral-500'
          )}
        >
          {status.text}
        </p>
      ) : (
        <p className="text-[11px] text-neutral-400 sm:text-center">JPG, PNG, WebP · ≤ 5 MB</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- identity card
function IdentityCard({ user, onAvatarChange }: { user: UserDto; onAvatarChange: (u: UserDto) => void }) {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const since = new Date(user.createdAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', { month: 'long', year: 'numeric' });
  const place = [user.dormitory, user.commonArea].filter(Boolean).join(' · ');

  return (
    <section className="card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
      <AvatarEditor user={user} onChange={onAvatarChange} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-serif text-2xl font-bold text-neutral-900 truncate">{user.fullName || user.username}</p>
          {user.isEmailVerified && (
            <span className="chip inline-flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> {t('Đã xác minh', 'Verified')}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {user.username && <span>@{user.username}</span>}
          <span className="inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {user.email}
          </span>
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-xs text-neutral-600">
          {user.studentCode && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100">
              <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> {t('MSSV', 'Student ID')} <strong className="tabular">{user.studentCode}</strong>
            </span>
          )}
          {place && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {place}
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100">{t(`Thành viên từ ${since}`, `Member since ${since}`)}</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- profile form
function ProfileSection({ user, justSaved, onSaved }: { user: UserDto; justSaved: boolean; onSaved: (u: UserDto) => void }) {
  const t = useT();
  const [form, setForm] = useState<ProfileForm>(() => toForm(user));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(() =>
    justSaved ? { tone: 'success', text: t('Đã lưu thông tin hồ sơ.', 'Profile saved.') } : null
  );

  const original = useMemo(() => toForm(user), [user]);
  const dirty = (Object.keys(form) as (keyof ProfileForm)[]).some((k) => form[k].trim() !== original[k]);

  const nameError = form.fullName.trim().length < 2 ? t('Họ tên phải có ít nhất 2 ký tự.', 'Full name needs at least 2 characters.') : null;
  const phoneError =
    form.phoneNumber.trim() && !PHONE_RE.test(form.phoneNumber.trim()) ? t('Số điện thoại gồm 9–15 chữ số.', 'Phone number must be 9–15 digits.') : null;

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (nameError || phoneError || !dirty) return;
    setSaving(true);
    setStatus(null);
    try {
      // Send every field trimmed: '' clears it on the backend.
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as ProfileForm;
      const updated = await profileApi.update(body);
      onSaved(updated); // remounts this form (new key) with the success notice
    } catch (err) {
      setStatus({ tone: 'error', text: apiError(err, t('Không lưu được hồ sơ.', 'Could not save your profile.')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      icon={<UserRound className="w-5 h-5" />}
      title={t('Thông tin cá nhân', 'Personal details')}
      description={t('Người mua sẽ thấy trường và khu vực của bạn để hẹn gặp thuận tiện.', 'Buyers see your school and area to arrange meet-ups.')}
    >
      <form onSubmit={submit} noValidate className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="fullName" label={t('Họ và tên', 'Full name')} value={form.fullName} onChange={set('fullName')} autoComplete="name" error={nameError} />
          <Field
            id="phoneNumber"
            label={t('Số điện thoại', 'Phone number')}
            value={form.phoneNumber}
            onChange={set('phoneNumber')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0912345678"
            error={phoneError}
          />
        </div>

        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" aria-hidden="true" /> {t('Sinh viên', 'Student')}
          </legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="schoolName" label={t('Trường', 'School')} value={form.schoolName} onChange={set('schoolName')} placeholder={t('VD: Đại học FPT', 'e.g. FPT University')} maxLength={200} />
            <Field
              id="studentCode"
              label={t('Mã số sinh viên', 'Student ID')}
              value={form.studentCode}
              onChange={set('studentCode')}
              placeholder="SE123456"
              maxLength={50}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" aria-hidden="true" /> {t('Nơi ở', 'Where you live')}
          </legend>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              id="dormitory"
              label={t('Ký túc xá / Địa chỉ', 'Dorm / Address')}
              value={form.dormitory}
              onChange={set('dormitory')}
              placeholder={t('VD: KTX khu A, phòng 305', 'e.g. Dorm A, room 305')}
              maxLength={200}
            />
            <Field
              id="commonArea"
              label={t('Khu vực', 'Area')}
              value={form.commonArea}
              onChange={set('commonArea')}
              placeholder={t('VD: Thủ Đức, TP.HCM', 'e.g. Thu Duc, HCMC')}
              maxLength={200}
              hint={t('Nơi bạn thường hẹn giao nhận đồ.', 'Where you usually meet for hand-offs.')}
            />
          </div>
        </fieldset>

        {status && <Notice tone={status.tone}>{status.text}</Notice>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => { setForm(original); setStatus(null); }}>
            {t('Hoàn tác', 'Discard')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!dirty || saving || !!nameError || !!phoneError}>
            {saving ? <Spinner className="w-4 h-4 border-white/40 border-t-white" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            {t('Lưu thay đổi', 'Save changes')}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------- password
function PasswordSection() {
  const t = useT();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = [
    { ok: pw.newPassword.length >= 6, vi: 'Ít nhất 6 ký tự', en: 'At least 6 characters' },
    { ok: /[A-Za-z]/.test(pw.newPassword), vi: 'Có ít nhất 1 chữ cái', en: 'At least 1 letter' },
    { ok: /\d/.test(pw.newPassword), vi: 'Có ít nhất 1 chữ số', en: 'At least 1 number' },
    { ok: !!pw.newPassword && pw.newPassword !== pw.currentPassword, vi: 'Khác mật khẩu hiện tại', en: 'Different from current' },
  ];
  const mismatch = !!pw.confirmPassword && pw.confirmPassword !== pw.newPassword;
  const valid = !!pw.currentPassword && rules.every((r) => r.ok) && pw.confirmPassword === pw.newPassword;

  const set = (k: keyof typeof pw) => (v: string) => {
    setError(null);
    setPw((p) => ({ ...p, [k]: v }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.changePassword(pw);
      // Backend revoked every session; sign out locally and ask for the new password.
      await logout();
      router.replace('/auth?reason=password-changed');
    } catch (err) {
      const msg = apiError(err, t('Không đổi được mật khẩu.', 'Could not change your password.'));
      setError(/invalid current password/i.test(msg) ? t('Mật khẩu hiện tại không đúng.', 'Current password is incorrect.') : msg);
      setSaving(false);
    }
  };

  return (
    <Section
      icon={<KeyRound className="w-5 h-5" />}
      title={t('Đổi mật khẩu', 'Change password')}
      description={t('Sau khi đổi, bạn sẽ được đăng xuất khỏi mọi thiết bị.', "You'll be signed out on every device afterwards.")}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField id="currentPassword" label={t('Mật khẩu hiện tại', 'Current password')} value={pw.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" />
        <PasswordField id="newPassword" label={t('Mật khẩu mới', 'New password')} value={pw.newPassword} onChange={set('newPassword')} autoComplete="new-password" />

        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-1" aria-label={t('Yêu cầu mật khẩu', 'Password requirements')}>
          {rules.map((r) => (
            <li key={r.en} className={cn('flex items-center gap-1.5 text-[11px] transition-colors', r.ok ? 'text-emerald-700' : 'text-neutral-400')}>
              <span className={cn('w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0', r.ok ? 'bg-emerald-600 text-white' : 'border border-neutral-300')}>
                {r.ok && <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
              </span>
              {t(r.vi, r.en)}
              <span className="sr-only">{r.ok ? t('(đạt)', '(met)') : t('(chưa đạt)', '(not met)')}</span>
            </li>
          ))}
        </ul>

        <PasswordField
          id="confirmPassword"
          label={t('Nhập lại mật khẩu mới', 'Confirm new password')}
          value={pw.confirmPassword}
          onChange={set('confirmPassword')}
          autoComplete="new-password"
          error={mismatch ? t('Mật khẩu nhập lại không khớp.', 'Passwords do not match.') : null}
        />

        {error && <Notice>{error}</Notice>}

        <button type="submit" className="btn btn-primary w-full" disabled={!valid || saving}>
          {saving ? <Spinner className="w-4 h-4 border-white/40 border-t-white" /> : <KeyRound className="w-4 h-4" aria-hidden="true" />}
          {t('Cập nhật mật khẩu', 'Update password')}
        </button>
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------- page
function Profile() {
  const t = useT();
  const { user, setUser } = useAuthStore();
  const [justSaved, setJustSaved] = useState(false);
  // Bumped only when profile fields come from the server, so an avatar change keeps unsaved edits.
  const [formKey, setFormKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The stored user can be stale (edited on another device) — refresh it once.
  useEffect(() => {
    profileApi
      .get()
      .then((u) => {
        setUser(u);
        setFormKey((k) => k + 1);
      })
      .catch((e) => setLoadError(apiError(e, t('Không tải được hồ sơ mới nhất.', 'Could not load your latest profile.'))));
  }, [setUser, t]);

  if (!user) return null;

  return (
    <>
      <PageHeader title={t('Hồ sơ của tôi', 'My profile')} subtitle={t('Quản lý thông tin sinh viên, nơi ở và bảo mật tài khoản.', 'Manage your student details, address and account security.')} />
      {loadError && <div className="mb-6"><Notice tone="info">{loadError}</Notice></div>}
      <div className="space-y-6">
        <IdentityCard user={user} onAvatarChange={setUser} />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] gap-6 items-start">
          <ProfileSection
            key={formKey}
            user={user}
            justSaved={justSaved}
            onSaved={(u) => {
              setJustSaved(true);
              setUser(u);
              setFormKey((k) => k + 1);
            }}
          />
          <PasswordSection />
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <RequireAuth>
        <Profile />
      </RequireAuth>
    </AppShell>
  );
}
