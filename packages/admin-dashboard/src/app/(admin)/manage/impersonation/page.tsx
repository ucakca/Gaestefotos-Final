'use client';

import { useState } from 'react';
import { UserCog, Search, Key, Clock, Loader2, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function ImpersonationPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!email || !reason) {
      toast.error('Bitte E-Mail und Grund angeben');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ token: string }>('/admin/impersonation/generate', {
        email,
        reason,
        ttlMinutes,
      });
      setToken(res.data.token);
      toast.success('Token generiert');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Generieren');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success('Token kopiert');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setEmail('');
    setReason('');
    setToken(null);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
          <UserCog className="w-6 h-6 text-app-accent" />
          Impersonation
        </h1>
        <p className="mt-1 text-sm text-app-muted">
          Generiere temporäre Tokens um als User zu testen/debuggen
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-yellow-500/30 bg-warning/5 p-4">
        <p className="text-sm text-warning">
          ⚠️ <strong>Achtung:</strong> Impersonation wird geloggt. Nutze nur für legitime Support-Anfragen.
        </p>
      </div>

      {!token ? (
        <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-6">
          {/* Email */}
          <div>
            <label className="text-sm font-medium mb-2 block">User E-Mail</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-medium mb-2 block">Grund</label>
            <Input
              placeholder="z.B. Support-Ticket #1234"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* TTL */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Gültigkeit (Minuten)
            </label>
            <Input
              type="number"
              min={5}
              max={120}
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(parseInt(e.target.value) || 30)}
              className="w-32"
            />
            <p className="text-xs text-app-muted mt-1">5-120 Minuten</p>
          </div>

          {/* Generate */}
          <Button onClick={handleGenerate} disabled={loading || !email || !reason} className="w-full">
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Key className="w-4 h-4 mr-2" />
            )}
            Token generieren
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-success/30 bg-success/100/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-success">
            <Check className="w-5 h-5" />
            <span className="font-medium">Token generiert</span>
          </div>

          <div className="p-4 rounded-xl bg-app-bg border border-app-border">
            <p className="text-xs text-app-muted mb-2">Token (klicken zum Kopieren)</p>
            <button
              onClick={handleCopy}
              className="w-full text-left font-mono text-sm break-all p-2 rounded hover:bg-app-card transition-colors"
            >
              {token}
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="flex-1">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Kopiert!' : 'Kopieren'}
            </Button>
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Neuen Token erstellen
            </Button>
          </div>

          <p className="text-xs text-app-muted text-center">
            Gültig für {ttlMinutes} Minuten • User: {email}
          </p>
        </div>
      )}
    </div>
  );
}
