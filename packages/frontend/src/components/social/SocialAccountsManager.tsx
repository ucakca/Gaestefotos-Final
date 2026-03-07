'use client';

import { useState, useEffect, useCallback } from 'react';
import { Facebook, Instagram, Loader2, Unplug, ExternalLink, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface SocialAccount {
  id: string;
  provider: 'FACEBOOK' | 'INSTAGRAM';
  accountName: string | null;
  accountImageUrl: string | null;
  igUsername: string | null;
  isActive: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
}

interface SocialAccountsManagerProps {
  className?: string;
  redirectPath?: string;
}

export default function SocialAccountsManager({ className = '', redirectPath }: SocialAccountsManagerProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get('/social/accounts');
      setAccounts(data.accounts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Konten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();

    // Check for callback params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('social_connected') === 'true') {
        loadAccounts();
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('social_connected');
        window.history.replaceState({}, '', url.toString());
      }
      const socialError = params.get('social_error');
      if (socialError) {
        const errorMessages: Record<string, string> = {
          denied: 'Zugriff wurde verweigert',
          invalid: 'Ungültige Antwort von Meta',
          expired: 'Sitzung abgelaufen, bitte erneut versuchen',
          server: 'Serverfehler bei der Verbindung',
        };
        setError(errorMessages[socialError] || 'Verbindung fehlgeschlagen');
        const url = new URL(window.location.href);
        url.searchParams.delete('social_error');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [loadAccounts]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const redirect = redirectPath || (typeof window !== 'undefined' ? window.location.pathname : '/dashboard');
      const { data } = await api.get(`/social/auth-url?redirect=${encodeURIComponent(redirect)}`);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verbindung konnte nicht gestartet werden');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Konto wirklich trennen?')) return;
    try {
      setDisconnecting(accountId);
      await api.delete(`/social/accounts/${accountId}`);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Trennung fehlgeschlagen');
    } finally {
      setDisconnecting(null);
    }
  };

  const isTokenExpiring = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 7;
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
            >
              {/* Provider icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                account.provider === 'INSTAGRAM'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-blue-600'
              }`}>
                {account.accountImageUrl ? (
                  <img
                    src={account.accountImageUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : account.provider === 'INSTAGRAM' ? (
                  <Instagram className="w-5 h-5 text-white" />
                ) : (
                  <Facebook className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Account info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {account.accountName || (account.igUsername ? `@${account.igUsername}` : 'Unbekannt')}
                  </span>
                  {account.isActive && !isTokenExpired(account.tokenExpiresAt) ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {account.provider === 'INSTAGRAM' && account.igUsername && (
                    <span>@{account.igUsername} · </span>
                  )}
                  {account.provider === 'FACEBOOK' ? 'Facebook' : 'Instagram'}
                  {isTokenExpired(account.tokenExpiresAt) && (
                    <span className="text-destructive ml-1">· Token abgelaufen</span>
                  )}
                  {!isTokenExpired(account.tokenExpiresAt) && isTokenExpiring(account.tokenExpiresAt) && (
                    <span className="text-amber-500 ml-1">· Token läuft bald ab</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {(isTokenExpired(account.tokenExpiresAt) || isTokenExpiring(account.tokenExpiresAt)) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleConnect}
                    title="Erneut verbinden"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={disconnecting === account.id}
                  title="Trennen"
                  className="text-muted-foreground hover:text-destructive"
                >
                  {disconnecting === account.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unplug className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect button */}
      <Button
        variant={accounts.length > 0 ? 'secondary' : 'primary'}
        onClick={handleConnect}
        disabled={connecting}
        className="w-full gap-2"
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        {accounts.length > 0 ? 'Weiteres Konto verbinden' : 'Facebook / Instagram verbinden'}
      </Button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Verbinde dein Facebook- oder Instagram-Konto, um Fotos direkt aus dem Dashboard zu veröffentlichen.
        Es werden nur die nötigen Berechtigungen angefragt.
      </p>
    </div>
  );
}
