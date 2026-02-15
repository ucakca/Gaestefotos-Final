'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Link as LinkIcon, QrCode, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface ShareSectionProps {
  eventId: string;
  eventSlug: string;
  onQrCode?: () => void;
}

export default function ShareSection({ eventId, eventSlug, onQrCode }: ShareSectionProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareLink = async () => {
    try {
      setError(null);
      setLoading(true);
      const { data } = await api.post(`/events/${eventId}/invite-token`);
      const url = data?.shareUrl;
      if (typeof url === 'string' && url.length > 0) {
        setShareUrl(url);
      } else {
        setError('Link konnte nicht erstellt werden');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (!shareUrl) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Event-Einladung', url: shareUrl });
        return;
      } catch {}
    }
    copyToClipboard();
  };

  const eventUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/e3/${eventSlug}` 
    : `/e3/${eventSlug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Teilen & Einladen
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Teile dein Event mit Gästen per Link, QR-Code oder WhatsApp
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Direct Event Link */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Event-Link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground truncate">
              {eventUrl}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(eventUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Share Link with Token */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Einladungs-Link (mit Zugang)</label>
          {!shareUrl ? (
            <Button
              variant="primary"
              onClick={generateShareLink}
              disabled={loading}
              className="w-full gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              {loading ? 'Erstelle...' : 'Einladungs-Link erstellen'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground truncate">
                  {shareUrl}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={shareNative}
                  className="flex-1 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Teilen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank')}
                  className="flex-1 gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>

        {/* QR Code Button */}
        {onQrCode && (
          <Button
            variant="secondary"
            onClick={onQrCode}
            className="w-full gap-2"
          >
            <QrCode className="w-4 h-4" />
            QR-Code anzeigen
          </Button>
        )}
      </div>
    </motion.div>
  );
}
