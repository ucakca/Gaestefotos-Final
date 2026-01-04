'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAdminAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorVerifyToken, setTwoFactorVerifyToken] = useState<string | null>(null);
  const [twoFactorSetupToken, setTwoFactorSetupToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorConfirmLoading, setTwoFactorConfirmLoading] = useState(false);
  const [twoFactorSecretBase32, setTwoFactorSecretBase32] = useState<string | null>(null);
  const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState<string | null>(null);
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokenBootstrapStartedRef = useRef(false);
  const tokenFromUrl = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tokenFromUrl.current === null) {
      const params = new URLSearchParams(window.location.search);
      tokenFromUrl.current = params.get('token');
    }

    if (!tokenFromUrl.current) return;
    if (tokenBootstrapStartedRef.current) return;
    tokenBootstrapStartedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const meRes = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${tokenFromUrl.current}`,
          },
        });

        const user = meRes.data?.user;
        if (!user || user.role !== 'ADMIN') {
          setError('Zugriff verweigert: Keine Admin-Berechtigung');
          setLoading(false);
          return;
        }

        login(String(tokenFromUrl.current), {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        });

        window.history.replaceState(null, '', '/login');
        router.push('/dashboard');
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Anmeldung fehlgeschlagen. Bitte erneut anmelden.');
        setLoading(false);
      }
    })();
  }, [login, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (twoFactorVerifyToken) {
        const response = await api.post('/auth/2fa/verify', {
          twoFactorToken: twoFactorVerifyToken,
          code: twoFactorCode || undefined,
          recoveryCode: recoveryCode || undefined,
        });

        const { token, user } = response.data;

        if (user.role !== 'ADMIN') {
          setError('Zugriff verweigert: Keine Admin-Berechtigung');
          setLoading(false);
          return;
        }

        login(token, {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        });

        router.push('/dashboard');
        return;
      }

      if (twoFactorSetupToken) {
        if (!twoFactorOtpAuthUrl && !twoFactorSecretBase32 && twoFactorRecoveryCodes.length === 0) {
          setLoading(false);
          return;
        }

        const response = await api.post('/auth/2fa/setup/confirm-challenge', {
          twoFactorToken: twoFactorSetupToken,
          code: twoFactorCode,
        });

        const { token, user } = response.data;

        if (user.role !== 'ADMIN') {
          setError('Zugriff verweigert: Keine Admin-Berechtigung');
          setLoading(false);
          return;
        }

        login(token, {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        });

        router.push('/dashboard');
        return;
      }

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const {
        token,
        user,
        twoFactorRequired,
        twoFactorSetupRequired,
        twoFactorToken: nextTwoFactorToken,
      } = response.data;

      if (user.role !== 'ADMIN') {
        setError('Zugriff verweigert: Keine Admin-Berechtigung');
        setLoading(false);
        return;
      }

      if (twoFactorRequired) {
        const tokenStr = String(nextTwoFactorToken || '').trim();
        if (!tokenStr) {
          setError('2FA Fehler: Challenge Token fehlt. Bitte erneut anmelden.');
          setLoading(false);
          return;
        }
        setTwoFactorVerifyToken(tokenStr);
        setTwoFactorSetupToken(null);
        setTwoFactorCode('');
        setRecoveryCode('');
        return;
      }

      if (twoFactorSetupRequired) {
        const setupToken = String(nextTwoFactorToken || '').trim();
        if (!setupToken) {
          setError('2FA Fehler: Setup-Token fehlt. Bitte erneut anmelden.');
          setLoading(false);
          return;
        }
        setTwoFactorSetupToken(setupToken);
        setTwoFactorVerifyToken(null);
        setTwoFactorCode('');
        setRecoveryCode('');

        try {
          setTwoFactorSetupLoading(true);
          const setupRes = await api.post('/auth/2fa/setup/start-challenge', {
            twoFactorToken: setupToken,
          });

          const secret = String(setupRes.data?.secretBase32 || '');
          const url = String(setupRes.data?.otpauthUrl || '');
          const recoveryCodes = Array.isArray(setupRes.data?.recoveryCodes) ? (setupRes.data.recoveryCodes as string[]) : [];
          setTwoFactorSecretBase32(secret || null);
          setTwoFactorOtpAuthUrl(url || null);
          setTwoFactorRecoveryCodes(recoveryCodes);
        } catch (e: any) {
          setError(e?.response?.data?.error || e?.message || '2FA Setup fehlgeschlagen');
        } finally {
          setTwoFactorSetupLoading(false);
        }

        return;
      }

      login(token, {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        role: user.role,
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-app-muted">Bitte melde dich an</p>
        </div>

        <Card className="p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-lg border border-[var(--status-danger)] bg-app-bg px-4 py-3 text-sm text-[var(--status-danger)]">
                {error}
              </div>
            ) : null}

            {!twoFactorVerifyToken && !twoFactorSetupToken ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-app-fg">
                    E-Mail-Adresse
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-app-fg">
                    Passwort
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : twoFactorVerifyToken ? (
              <>
                <div className="rounded-lg border border-app-border bg-app-card px-4 py-3 text-sm text-app-fg">
                  2FA ist aktiviert. Bitte gib deinen Authenticator-Code ein oder verwende einen Recovery-Code.
                </div>

                <div className="space-y-2">
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-app-fg">
                    2FA Code
                  </label>
                  <Input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="recoveryCode" className="block text-sm font-medium text-app-fg">
                    Recovery Code (optional)
                  </label>
                  <Input
                    id="recoveryCode"
                    name="recoveryCode"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="ABCD-EFGH-IJ"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-app-border bg-app-card px-4 py-3 text-sm text-app-fg">
                  2FA ist für Admins verpflichtend. Bitte richte jetzt eine Authenticator-App ein und bestätige den Code.
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-app-muted">otpauth:// URL</div>
                  <div className="break-all rounded-lg border border-app-border bg-app-bg px-3 py-2 font-mono text-xs text-app-fg">
                    {twoFactorOtpAuthUrl || (twoFactorSetupLoading ? 'Wird geladen…' : '-')}
                  </div>
                </div>

                {twoFactorSecretBase32 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-app-muted">Secret (Base32)</div>
                    <div className="rounded-lg border border-app-border bg-app-bg px-3 py-2 font-mono text-xs text-app-fg">
                      {twoFactorSecretBase32}
                    </div>
                  </div>
                ) : null}

                {twoFactorRecoveryCodes.length ? (
                  <div className="space-y-2">
                    <div className="text-xs text-app-muted">Recovery Codes (einmalig anzeigen)</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {twoFactorRecoveryCodes.map((c) => (
                        <div key={c} className="rounded-lg border border-app-border bg-app-bg px-3 py-2 font-mono text-xs text-app-fg">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label htmlFor="twoFactorConfirmCode" className="block text-sm font-medium text-app-fg">
                    2FA Code
                  </label>
                  <Input
                    id="twoFactorConfirmCode"
                    name="twoFactorConfirmCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                  />
                </div>

                <Button
                  type="button"
                  disabled={twoFactorConfirmLoading || twoFactorSetupLoading}
                  onClick={async () => {
                    if (!twoFactorSetupToken) return;
                    try {
                      setTwoFactorConfirmLoading(true);
                      setError('');
                      const response = await api.post('/auth/2fa/setup/confirm-challenge', {
                        twoFactorToken: twoFactorSetupToken,
                        code: twoFactorCode,
                      });
                      const { token, user } = response.data;

                      if (user.role !== 'ADMIN') {
                        setError('Zugriff verweigert: Keine Admin-Berechtigung');
                        return;
                      }

                      login(token, {
                        id: user.id,
                        email: user.email,
                        name: user.name || user.email,
                        role: user.role,
                      });

                      router.push('/dashboard');
                    } catch (e: any) {
                      setError(e?.response?.data?.error || e?.message || '2FA Bestätigung fehlgeschlagen');
                    } finally {
                      setTwoFactorConfirmLoading(false);
                    }
                  }}
                  className="w-full"
                >
                  {twoFactorConfirmLoading ? 'Prüfen…' : '2FA aktivieren & weiter'}
                </Button>
              </>
            )}

            {!twoFactorSetupToken ? (
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Wird angemeldet...' : twoFactorVerifyToken ? 'Bestätigen' : 'Anmelden'}
              </Button>
            ) : null}

            <p className="text-center text-xs text-app-muted">
              Zugriff ist nur für Administratoren erlaubt.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

