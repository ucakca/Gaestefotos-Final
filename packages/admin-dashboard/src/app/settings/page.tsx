"use client";

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import FullPageLoader from '@/components/FullPageLoader';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [faceSearchNoticeText, setFaceSearchNoticeText] = useState('');
  const [faceSearchCheckboxLabel, setFaceSearchCheckboxLabel] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorConfirmLoading, setTwoFactorConfirmLoading] = useState(false);
  const [twoFactorSecretBase32, setTwoFactorSecretBase32] = useState<string | null>(null);
  const [twoFactorOtpAuthUrl, setTwoFactorOtpAuthUrl] = useState<string | null>(null);
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([]);
  const [twoFactorConfirmCode, setTwoFactorConfirmCode] = useState('');

  const tokenEntries = useMemo(() => {
    const entries = Object.entries(tokens);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [tokens]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [themeRes, faceSearchRes] = await Promise.all([
          api.get('/admin/theme'),
          api.get('/admin/face-search-consent'),
        ]);

        const meRes = await api.get('/auth/me');

        const nextTokens = (themeRes.data?.tokens || {}) as Record<string, string>;
        const nextNoticeText = (faceSearchRes.data?.noticeText || '') as string;
        const nextCheckboxLabel = (faceSearchRes.data?.checkboxLabel || '') as string;
        const me = (meRes.data?.user || {}) as any;
        if (!mounted) return;
        setTokens(nextTokens);
        setFaceSearchNoticeText(nextNoticeText);
        setFaceSearchCheckboxLabel(nextCheckboxLabel);
        setTwoFactorEnabled(!!me.twoFactorEnabled);
        setTwoFactorPending(!!me.twoFactorPending);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function startTwoFactorSetup() {
    try {
      setTwoFactorSetupLoading(true);
      setError(null);
      const res = await api.post('/auth/2fa/setup/start');
      const secret = String(res.data?.secretBase32 || '');
      const url = String(res.data?.otpauthUrl || '');
      const recoveryCodes = Array.isArray(res.data?.recoveryCodes) ? (res.data.recoveryCodes as string[]) : [];
      setTwoFactorSecretBase32(secret || null);
      setTwoFactorOtpAuthUrl(url || null);
      setTwoFactorRecoveryCodes(recoveryCodes);
      setTwoFactorPending(true);
      toast.success('2FA Setup gestartet');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '2FA Setup fehlgeschlagen';
      setError(msg);
      toast.error(msg);
    } finally {
      setTwoFactorSetupLoading(false);
    }
  }

  async function confirmTwoFactorSetup() {
    try {
      setTwoFactorConfirmLoading(true);
      setError(null);
      await api.post('/auth/2fa/setup/confirm', { code: twoFactorConfirmCode });
      setTwoFactorEnabled(true);
      setTwoFactorPending(false);
      toast.success('2FA aktiviert');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '2FA Bestätigung fehlgeschlagen';
      setError(msg);
      toast.error(msg);
    } finally {
      setTwoFactorConfirmLoading(false);
    }
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const appliedKeys: string[] = [];
    for (const [k, v] of Object.entries(tokens)) {
      if (!k || !v) continue;
      root.style.setProperty(k, v);
      appliedKeys.push(k);
    }
    return () => {
      for (const k of appliedKeys) root.style.removeProperty(k);
    };
  }, [tokens]);

  function updateToken(key: string, value: string) {
    setTokens((prev) => ({ ...prev, [key]: value }));
  }

  function removeToken(key: string) {
    setTokens((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function addToken() {
    const base = '--custom-token';
    let idx = 1;
    let key = `${base}-${idx}`;
    while (tokens[key] !== undefined) {
      idx += 1;
      key = `${base}-${idx}`;
    }
    setTokens((prev) => ({ ...prev, [key]: '' }));
  }

  async function save() {
    try {
      setSaving(true);
      setError(null);
      await Promise.all([
        api.put('/admin/theme', { tokens }),
        api.put('/admin/face-search-consent', {
          noticeText: faceSearchNoticeText,
          checkboxLabel: faceSearchCheckboxLabel,
        }),
      ]);
      toast.success('Theme gespeichert');
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Einstellungen</h1>
        <p className="mt-1 text-sm text-app-muted">Systemweite Konfiguration</p>
      </div>

      {loading ? <FullPageLoader label="Wird geladen…" /> : null}

      {!loading && error ? (
        <Card className="p-5">
          <p className="text-sm text-[var(--status-danger)]">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs text-app-muted">Security</div>
                <div className="mt-1 text-base font-medium text-app-fg">2FA (TOTP)</div>
                <div className="mt-2 text-sm text-app-muted">
                  Authenticator-App (z.B. 1Password, Google Authenticator, Authy) + Recovery Codes.
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!twoFactorEnabled ? (
                  <Button size="sm" onClick={startTwoFactorSetup} disabled={twoFactorSetupLoading}>
                    {twoFactorSetupLoading ? 'Start…' : twoFactorPending ? 'Neu starten' : 'Setup starten'}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg">
                    Aktiv
                  </div>
                )}
              </div>
            </div>

            {!twoFactorEnabled ? (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-app-border bg-app-bg p-4">
                  <div className="text-sm font-medium text-app-fg">Status</div>
                  <div className="mt-1 text-sm text-app-muted">
                    {twoFactorPending ? 'Setup läuft (Bestätigung ausstehend)' : 'Deaktiviert'}
                  </div>
                </div>

                {twoFactorOtpAuthUrl || twoFactorSecretBase32 || twoFactorRecoveryCodes.length ? (
                  <div className="rounded-lg border border-app-border bg-app-bg p-4">
                    <div className="text-sm font-medium text-app-fg">Setup Daten</div>
                    <div className="mt-2 space-y-3 text-sm">
                      {twoFactorOtpAuthUrl ? (
                        <div>
                          <div className="text-xs text-app-muted">otpauth:// URL</div>
                          <div className="mt-1 break-all rounded-lg border border-app-border bg-app-card px-3 py-2 font-mono text-xs text-app-fg">
                            {twoFactorOtpAuthUrl}
                          </div>
                        </div>
                      ) : null}

                      {twoFactorSecretBase32 ? (
                        <div>
                          <div className="text-xs text-app-muted">Secret (Base32)</div>
                          <div className="mt-1 rounded-lg border border-app-border bg-app-card px-3 py-2 font-mono text-xs text-app-fg">
                            {twoFactorSecretBase32}
                          </div>
                        </div>
                      ) : null}

                      {twoFactorRecoveryCodes.length ? (
                        <div>
                          <div className="text-xs text-app-muted">Recovery Codes (einmalig anzeigen)</div>
                          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {twoFactorRecoveryCodes.map((c) => (
                              <div
                                key={c}
                                className="rounded-lg border border-app-border bg-app-card px-3 py-2 font-mono text-xs text-app-fg"
                              >
                                {c}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {twoFactorPending ? (
                  <div className="lg:col-span-2 rounded-lg border border-app-border bg-app-bg p-4">
                    <div className="text-sm font-medium text-app-fg">Bestätigen</div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label htmlFor="twoFactorConfirmCode" className="block text-xs font-medium text-app-muted">
                          6-stelliger Code
                        </label>
                        <Input
                          id="twoFactorConfirmCode"
                          name="twoFactorConfirmCode"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={twoFactorConfirmCode}
                          onChange={(e) => setTwoFactorConfirmCode(e.target.value)}
                          placeholder="123456"
                        />
                      </div>
                      <Button onClick={confirmTwoFactorSetup} disabled={twoFactorConfirmLoading}>
                        {twoFactorConfirmLoading ? 'Prüfen…' : 'Aktivieren'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs text-app-muted">Theme Tokens</div>
                <div className="mt-1 text-base font-medium text-app-fg">CSS Variablen (Live Preview)</div>
                <div className="mt-2 text-sm text-app-muted">
                  Speichert in der DB (AppSetting). Keys müssen echte CSS-Variablen sein (z.B. <span className="font-mono">--app-bg</span>).
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addToken}>
                  Token hinzufügen
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {tokenEntries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                  <div className="sm:col-span-5">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const nextKey = e.target.value;
                        setTokens((prev) => {
                          if (nextKey === key) return prev;
                          const next = { ...prev };
                          const currentValue = next[key];
                          delete next[key];
                          next[nextKey] = currentValue;
                          return next;
                        });
                      }}
                      placeholder="--app-bg"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <Input
                      value={value}
                      onChange={(e) => updateToken(key, e.target.value)}
                      placeholder="#ffffff oder hsl(0 0% 100%)"
                    />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2 sm:justify-end">
                    <div
                      className="h-9 w-9 rounded-lg border border-app-border"
                      style={{ background: value || 'transparent' }}
                      title={value || ''}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeToken(key)}>
                      Entfernen
                    </Button>
                  </div>
                </div>
              ))}

              {tokenEntries.length === 0 ? (
                <div className="rounded-lg border border-app-border bg-app-bg p-4">
                  <p className="text-sm text-app-muted">Noch keine Tokens gesetzt.</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs text-app-muted">DSGVO</div>
                <div className="mt-1 text-base font-medium text-app-fg">Face Search Einwilligung</div>
                <div className="mt-2 text-sm text-app-muted">
                  Systemweiter Hinweistext + Checkbox-Label für biometrische Suche.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <div className="text-sm font-medium text-app-fg">Hinweistext</div>
                <div className="mt-1 text-sm text-app-muted">Wird im Frontend vor Face Search angezeigt.</div>
                <Textarea
                  value={faceSearchNoticeText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFaceSearchNoticeText(e.target.value)}
                  rows={8}
                  className="mt-3"
                  placeholder="z.B. Hinweis zu biometrischen Daten / Einwilligung (Art. 9 DSGVO)"
                />
              </div>

              <div>
                <div className="text-sm font-medium text-app-fg">Checkbox-Label</div>
                <div className="mt-1 text-sm text-app-muted">Kurztext neben der Einwilligungs-Checkbox.</div>
                <Input
                  value={faceSearchCheckboxLabel}
                  onChange={(e) => setFaceSearchCheckboxLabel(e.target.value)}
                  placeholder="Ich willige ein, dass …"
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs text-app-muted">Preview</div>
            <div className="mt-1 text-base font-medium text-app-fg">So wirkt das Theme</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-app-border bg-app-card p-4">
                <div className="text-sm font-medium text-app-fg">Card Titel</div>
                <div className="mt-1 text-sm text-app-muted">Muted Text / Secondary Copy</div>
              </div>
              <div className="rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-sm text-app-fg">Background / Border / Text Tokens</div>
              </div>
              <div className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-app-bg">
                Brand Button
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
