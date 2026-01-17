'use client';

import { useState, useEffect } from 'react';
import { Users, Copy, Share2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface CoHostsSectionProps {
  eventId: string;
  onCopy: (text: string, message?: string) => Promise<void>;
  onShare: (url: string, title: string) => Promise<void>;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function CoHostsSection({
  eventId,
  onCopy,
  onShare,
  onToast,
}: CoHostsSectionProps) {
  const [cohosts, setCohosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadCohosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/events/${eventId}/cohosts`);
      setCohosts(Array.isArray(data?.cohosts) ? data.cohosts : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const mintInvite = async () => {
    try {
      setMinting(true);
      const { data } = await api.post(`/events/${eventId}/cohosts/invite-token`);
      const url = data?.shareUrl || data?.inviteToken;
      setLastInviteUrl(url);
      if (url) await onCopy(url, 'Invite-Link kopiert');
    } catch (err: any) {
      onToast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setMinting(false);
    }
  };

  const sendEmailInvite = async () => {
    if (!inviteEmail.trim()) {
      onToast('Bitte E-Mail-Adresse eingeben', 'error');
      return;
    }
    try {
      setSendingEmail(true);
      const { data } = await api.post(`/events/${eventId}/cohosts/invite-token`, { email: inviteEmail });
      if (data?.emailSent) {
        onToast(`Einladung an ${inviteEmail} gesendet`, 'success');
        setInviteEmail('');
        setLastInviteUrl(data?.shareUrl || null);
      } else {
        onToast('E-Mail konnte nicht gesendet werden', 'error');
        setLastInviteUrl(data?.shareUrl || null);
      }
    } catch (err: any) {
      onToast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const remove = async (userId: string) => {
    try {
      setRemovingId(userId);
      await api.delete(`/events/${eventId}/cohosts/${userId}`);
      onToast('Co-Host entfernt', 'success');
      await loadCohosts();
    } catch (err: any) {
      onToast(err.response?.data?.error || 'Fehler', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    loadCohosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Co-Hosts</div>
          <div className="text-xs text-muted-foreground">
            Co-Hosts dürfen das Event verwalten
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={mintInvite} disabled={minting} size="sm">
            {minting ? 'Erstelle...' : 'Invite'}
          </Button>
          <Button variant="ghost" onClick={loadCohosts} disabled={loading} size="sm">
            ↻
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-2">Co-Host per E-Mail einladen</label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="name@beispiel.de"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
              onKeyPress={(e) => e.key === 'Enter' && sendEmailInvite()}
            />
            <Button onClick={sendEmailInvite} disabled={sendingEmail || !inviteEmail.trim()} size="sm">
              {sendingEmail ? 'Sende...' : 'Einladen'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            💡 Der Co-Host erhält einen Anmeldelink per E-Mail
          </p>
        </div>

        {lastInviteUrl && (
          <div className="mb-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="text-xs text-muted-foreground">Letzter Invite-Link</div>
            <div className="text-xs text-foreground break-all mt-1">{lastInviteUrl}</div>
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" size="sm" onClick={() => onCopy(lastInviteUrl, 'Kopiert')}>
                <Copy className="w-3 h-3 mr-1" />
                Kopieren
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onShare(lastInviteUrl, 'Co-Host Invite')}>
                <Share2 className="w-3 h-3 mr-1" />
                Teilen
              </Button>
            </div>
          </div>
        )}

        {error && <div className="text-sm text-destructive mb-2">{error}</div>}
        {loading && <div className="text-sm text-muted-foreground">Lade...</div>}
        {!loading && cohosts.length === 0 && (
          <div className="text-sm text-muted-foreground">Noch keine Co-Hosts</div>
        )}

        {cohosts.length > 0 && (
          <div className="space-y-2">
            {cohosts.map((m: any) => {
              const u = m?.user;
              const busy = removingId === u?.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{u?.name || '(ohne Namen)'}</div>
                    <div className="text-xs text-muted-foreground">{u?.email || '-'}</div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => u?.id && remove(u.id)}
                  >
                    {busy ? 'Entferne...' : 'Entfernen'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
