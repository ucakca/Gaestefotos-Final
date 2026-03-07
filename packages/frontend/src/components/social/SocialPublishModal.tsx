'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Facebook, Instagram, Loader2, CheckCircle2, AlertCircle, Send, Image as ImageIcon } from 'lucide-react';
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
}

interface SocialPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  defaultCaption?: string;
  onSuccess?: (provider: string, postId: string) => void;
}

export default function SocialPublishModal({
  isOpen,
  onClose,
  imageUrl,
  defaultCaption = '',
  onSuccess,
}: SocialPublishModalProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/social/accounts');
      const active = (data.accounts || []).filter(
        (a: SocialAccount) => a.isActive && (!a.tokenExpiresAt || new Date(a.tokenExpiresAt) > new Date())
      );
      setAccounts(active);
      if (active.length === 1) {
        setSelectedAccountId(active[0].id);
      }
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setCaption(defaultCaption);
      setResult(null);
      setPublishing(false);
    }
  }, [isOpen, loadAccounts, defaultCaption]);

  const handlePublish = async () => {
    if (!selectedAccountId || !imageUrl) return;
    try {
      setPublishing(true);
      setResult(null);
      const { data } = await api.post('/social/publish', {
        accountId: selectedAccountId,
        imageUrl,
        caption: caption.trim() || undefined,
      });
      const account = accounts.find((a) => a.id === selectedAccountId);
      setResult({
        success: true,
        message: `Erfolgreich auf ${account?.provider === 'INSTAGRAM' ? 'Instagram' : 'Facebook'} veröffentlicht!`,
      });
      onSuccess?.(account?.provider || '', data.postId || '');
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.error || 'Veröffentlichung fehlgeschlagen',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleConnectRedirect = async () => {
    try {
      const redirect = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      const { data } = await api.get(`/social/auth-url?redirect=${encodeURIComponent(redirect)}`);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const igCaptionLimit = 2200;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4" />
            Auf Social Media teilen
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image preview */}
          <div className="relative w-full aspect-square max-h-48 rounded-xl overflow-hidden bg-muted border border-border">
            <img
              src={imageUrl}
              alt="Vorschau"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length === 0 ? (
            /* No accounts connected */
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Kein Social-Media-Konto verbunden.
              </p>
              <Button variant="primary" onClick={handleConnectRedirect} className="gap-2">
                Facebook / Instagram verbinden
              </Button>
            </div>
          ) : (
            <>
              {/* Account selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Konto auswählen
                </label>
                <div className="grid gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                        selectedAccountId === account.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30 bg-card'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          account.provider === 'INSTAGRAM'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-blue-600'
                        }`}
                      >
                        {account.provider === 'INSTAGRAM' ? (
                          <Instagram className="w-4 h-4 text-white" />
                        ) : (
                          <Facebook className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {account.accountName ||
                            (account.igUsername ? `@${account.igUsername}` : 'Unbekannt')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {account.provider === 'FACEBOOK' ? 'Facebook-Seite' : 'Instagram Business'}
                        </div>
                      </div>
                      {selectedAccountId === account.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption input */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Bildunterschrift (optional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Schreibe eine Bildunterschrift..."
                  rows={3}
                  maxLength={igCaptionLimit}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {selectedAccount?.provider === 'INSTAGRAM' && (
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {caption.length}/{igCaptionLimit}
                  </div>
                )}
              </div>

              {/* Result message */}
              {result && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    result.success
                      ? 'bg-green-500/10 border border-green-500/20 text-green-600'
                      : 'bg-destructive/10 border border-destructive/20 text-destructive'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  {result.message}
                </div>
              )}

              {/* Publish button */}
              <Button
                variant="primary"
                onClick={result?.success ? onClose : handlePublish}
                disabled={!selectedAccountId || publishing}
                className="w-full gap-2"
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : result?.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {publishing
                  ? 'Wird veröffentlicht...'
                  : result?.success
                  ? 'Schließen'
                  : 'Jetzt veröffentlichen'}
              </Button>

              {selectedAccount?.provider === 'INSTAGRAM' && !result && (
                <p className="text-xs text-muted-foreground text-center">
                  Das Bild muss öffentlich erreichbar sein (HTTPS). Instagram verarbeitet das Bild in ca. 10–30 Sekunden.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
