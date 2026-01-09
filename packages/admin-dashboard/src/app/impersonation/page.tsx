'use client';

import { useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type ImpersonationResponse = {
  token: string;
  expiresInSeconds: number;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
};

function safeCopy(text: string): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    void navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ImpersonationPage() {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [expiresInSeconds, setExpiresInSeconds] = useState('900');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImpersonationResponse | null>(null);

  const previewUrl = useMemo(() => {
    const token = result?.token || '';
    if (!token) return null;
    // We only provide a copyable URL; actual host depends on deployment.
    return `/dashboard?token=${encodeURIComponent(token)}`;
  }, [result?.token]);

  const issueToken = async () => {
    const uid = userId.trim();
    if (!uid) {
      toast.error('Bitte userId eingeben');
      return;
    }

    const ttl = Number(expiresInSeconds.trim());
    if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 3600) {
      toast.error('expiresInSeconds muss 1..3600 sein');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<ImpersonationResponse>('/admin/impersonation/token', {
        userId: uid,
        reason: reason.trim() || undefined,
        expiresInSeconds: ttl,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Impersonation fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Impersonation</h1>
        <p className="mt-1 text-sm text-app-muted">Temporären Token für einen User ausstellen (Admin/Superadmin)</p>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="mb-1 text-xs text-app-muted">userId *</div>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">expiresInSeconds (max 3600)</div>
              <Input value={expiresInSeconds} onChange={(e) => setExpiresInSeconds(e.target.value)} inputMode="numeric" />
            </div>
            <div className="sm:col-span-3">
              <div className="mb-1 text-xs text-app-muted">Reason (optional)</div>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z.B. Support: Bug reproduzieren" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setUserId('');
              setReason('');
              setExpiresInSeconds('900');
              setError(null);
              setResult(null);
            }}>
              Reset
            </Button>
            <Button variant="primary" size="sm" onClick={issueToken} disabled={loading}>
              {loading ? 'Erstelle…' : 'Token erstellen'}
            </Button>
          </div>

          {error ? <div className="mt-3 text-sm text-[var(--status-danger)]">{error}</div> : null}
        </Card>

        {result ? (
          <Card className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-app-fg">Token erstellt</div>
                <div className="mt-1 text-xs text-app-muted">
                  expiresInSeconds: {result.expiresInSeconds}
                </div>
                <div className="mt-2 text-xs text-app-muted">
                  User: {result.user.email} ({result.user.role})
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const ok = safeCopy(result.token);
                    toast.success(ok ? 'Token kopiert' : 'Token Copy: best-effort');
                  }}
                >
                  Copy Token
                </Button>
                {previewUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const ok = safeCopy(previewUrl);
                      toast.success(ok ? 'URL kopiert' : 'URL Copy: best-effort');
                    }}
                  >
                    Copy URL
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 text-xs text-app-muted">Token</div>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-lg border border-app-border bg-app-bg p-3 text-xs text-app-fg">
                {result.token}
              </pre>

              {previewUrl ? (
                <>
                  <div className="mt-3 mb-1 text-xs text-app-muted">URL (relativ, Host abhängig)</div>
                  <pre className="max-h-[120px] overflow-auto whitespace-pre-wrap rounded-lg border border-app-border bg-app-bg p-3 text-xs text-app-fg">
                    {previewUrl}
                  </pre>
                </>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
