import React, { useEffect, useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DynamicBrandLogo } from './DynamicBrandLogo';
import { LanguageToggleBar } from '../i18n/i18n';
import {
  AuthUserRecord,
  InvitePreviewInfo,
  apiAcceptInvite,
  apiFetchInvitePreview,
  apiLoginWithPassword,
  getRememberedIdentifier,
  saveStoredAuthSession,
  setRememberedIdentifier,
} from '../data/authClient';

interface LoginViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onAuthenticated: (user: AuthUserRecord, token: string, remember: boolean) => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  DISPECER: 'Dispecer',
  FINANCIAR: 'Financiar',
  SOFER: 'Șofer',
};

export const LoginView: React.FC<LoginViewProps> = ({
  theme,
  onToggleTheme,
  onAuthenticated,
}) => {
  const [inviteToken, setInviteToken] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('invite')?.trim() || '';
  });
  const [inviteInfo, setInviteInfo] = useState<InvitePreviewInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState<boolean>(Boolean(inviteToken));

  const [identifier, setIdentifier] = useState<string>(() => getRememberedIdentifier());
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [inviteName, setInviteName] = useState<string>('');
  const [inviteUsername, setInviteUsername] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      setInviteInfo(null);
      setInviteLoading(false);
      return;
    }
    let cancelled = false;
    setInviteLoading(true);
    setErrorMsg(null);
    apiFetchInvitePreview(inviteToken)
      .then((info) => {
        if (cancelled) return;
        setInviteInfo(info);
        setInviteName(info.name || '');
        setInviteUsername(info.username || '');
        setInviteLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setInviteInfo(null);
        setInviteLoading(false);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Linkul de invitație nu este valid sau a expirat.'
        );
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const clearInviteQueryFromUrl = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.pathname + url.search);
    setInviteToken('');
    setInviteInfo(null);
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMsg('Introdu utilizatorul (sau emailul) și parola.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { token, user } = await apiLoginWithPassword(cleanId, password, rememberMe);
      setRememberedIdentifier(cleanId, rememberMe);
      saveStoredAuthSession({ token, remember: rememberMe, user });
      onAuthenticated(user, token, rememberMe);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Email / utilizator sau parolă incorectă.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || !inviteToken) return;
    if (password.length < 6) {
      setErrorMsg('Parola trebuie să conțină cel puțin 6 caractere.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { token, user } = await apiAcceptInvite({
        token: inviteToken,
        password,
        name: inviteName.trim(),
        username: inviteUsername.trim(),
        remember: rememberMe,
      });
      setRememberedIdentifier(user.email, rememberMe);
      saveStoredAuthSession({ token, remember: rememberMe, user });
      clearInviteQueryFromUrl();
      onAuthenticated(user, token, rememberMe);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Nu s-a putut activa contul.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-theme={theme}
      className="min-h-dvh tahoe-wallpaper text-[#f5f5f7] flex flex-col p-4 sm:p-6 transition-colors duration-200"
    >
      {/* Top-right compact controls */}
      <div className="w-full flex items-center justify-end gap-2">
        <LanguageToggleBar />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={
            theme === 'dark' ? 'Comută pe Modul Luminos' : 'Comută pe Modul Întunecat'
          }
          title={
            theme === 'dark' ? 'Comută pe Modul Luminos' : 'Comută pe Modul Întunecat'
          }
          className="w-9 h-9 rounded-full tahoe-btn-secondary flex items-center justify-center transition cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#FF9F0A]" />
          ) : (
            <Moon className="w-4 h-4 text-[#0A84FF]" />
          )}
        </button>
      </div>

      {/* Classic Centered Card */}
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-[390px] tahoe-glass-elevated rounded-[28px] p-7 sm:p-8 border border-white/15">
          {/* Brand Logo */}
          <div className="flex flex-col items-center mb-6">
            <DynamicBrandLogo height={68} />
            <h1
              id="auth-card-heading"
              className="mt-4 text-xl font-extrabold text-white tracking-tight"
            >
              {inviteToken ? 'Activare cont' : 'Autentificare'}
            </h1>
          </div>

          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {inviteToken ? (
            inviteLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs font-semibold text-white/70">
                <Loader2 className="w-4 h-4 animate-spin text-[#0A84FF]" />
                <span>Se verifică invitația...</span>
              </div>
            ) : inviteInfo ? (
              <form
                method="POST"
                action="/api/auth/accept-invite"
                aria-labelledby="auth-card-heading"
                onSubmit={handleAcceptInviteSubmit}
                className="space-y-4"
              >
                <div className="px-4 py-2.5 rounded-full tahoe-card-inner flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white/85 truncate">
                    {inviteInfo.email}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0A84FF]/20 text-[#64D2FF] border border-[#0A84FF]/35 text-[11px] font-bold shrink-0">
                    {ROLE_LABELS[inviteInfo.role] || inviteInfo.role}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="invite-fullname"
                    className="block text-xs font-bold text-white/80 mb-1.5"
                  >
                    Nume
                  </label>
                  <input
                    id="invite-fullname"
                    name="name"
                    type="text"
                    autoComplete="name"
                    enterKeyHint="next"
                    required
                    value={inviteName}
                    onChange={(e) => {
                      setInviteName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full min-h-[46px] tahoe-card-inner rounded-full px-4 py-2.5 text-base sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-username"
                    className="block text-xs font-bold text-white/80 mb-1.5"
                  >
                    Utilizator
                  </label>
                  <input
                    id="invite-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="next"
                    required
                    value={inviteUsername}
                    onChange={(e) => {
                      setInviteUsername(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full min-h-[46px] tahoe-card-inner rounded-full px-4 py-2.5 text-base sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-password"
                    className="block text-xs font-bold text-white/80 mb-1.5"
                  >
                    Parolă (minim 6 caractere)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      id="invite-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      enterKeyHint="done"
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="••••••••"
                      className="w-full min-h-[46px] tahoe-card-inner rounded-full pl-10 pr-11 py-2.5 text-base sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                      aria-describedby="pw-toggle-sr-note"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-0.5">
                  <input
                    id="invite-remember"
                    name="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer"
                  />
                  <label
                    htmlFor="invite-remember"
                    className="text-xs font-semibold text-white/80 select-none cursor-pointer py-1"
                  >
                    Ține-mă minte
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-5 rounded-full tahoe-btn-primary text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Activează contul</span>
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-center">
                <button
                  type="button"
                  onClick={clearInviteQueryFromUrl}
                  className="w-full min-h-[46px] px-5 rounded-full tahoe-btn-secondary text-xs font-bold text-white cursor-pointer"
                >
                  Mergi la Autentificare
                </button>
              </div>
            )
          ) : (
            <form
              method="POST"
              action="/api/auth/login"
              aria-labelledby="auth-card-heading"
              onSubmit={handleLoginSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-bold text-white/80 mb-1.5"
                >
                  Email sau utilizator
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    id="login-identifier"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="next"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="nume@bluetrans.ro"
                    className="w-full min-h-[48px] tahoe-card-inner rounded-full pl-10 pr-4 py-2.5 text-base sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-white/80 mb-1.5"
                >
                  Parolă
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] tahoe-card-inner rounded-full pl-10 pr-11 py-2.5 text-base sm:text-sm font-semibold text-white border border-white/15 focus:outline-none focus:border-[#0A84FF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                    aria-describedby="pw-toggle-sr-note"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <span id="pw-toggle-sr-note" className="sr-only">
                Afișează parola în clar pe ecran.
              </span>

              <div className="flex items-center gap-2.5 pt-0.5">
                <input
                  id="login-remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer"
                />
                <label
                  htmlFor="login-remember"
                  className="text-xs font-semibold text-white/80 select-none cursor-pointer py-1"
                >
                  Ține-mă minte
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] px-5 rounded-full tahoe-btn-primary text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60 mt-1"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Intră în cont</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
