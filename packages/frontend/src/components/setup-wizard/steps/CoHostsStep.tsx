'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, SkipForward, UserPlus, Mail, Copy, Check, X, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface CoHostsStepProps {
  eventId?: string;
  onNext: (hasInvited: boolean) => void;
  onBack: () => void;
  onSkip: () => void;
}

interface CoHost {
  id: string;
  user: { id: string; name?: string; email?: string };
}

export default function CoHostsStep({
  eventId,
  onNext,
  onBack,
  onSkip,
}: CoHostsStepProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cohosts, setCohosts] = useState<CoHost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasInvited, setHasInvited] = useState(false);

  const sendEmailInvite = async () => {
    if (!eventId || !email.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben');
      return;
    }

    try {
      setSending(true);
      setError(null);
      const { data } = await api.post(`/events/${eventId}/cohosts/invite-token`, { email });
      if (data?.emailSent) {
        setSuccess(`Einladung an ${email} gesendet!`);
        setEmail('');
        setHasInvited(true);
        setTimeout(() => setSuccess(null), 3000);
      }
      if (data?.shareUrl) {
        setInviteUrl(data.shareUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Einladung fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  const generateInviteLink = async () => {
    if (!eventId) return;
    try {
      setSending(true);
      setError(null);
      const { data } = await api.post(`/events/${eventId}/cohosts/invite-token`);
      const url = data?.shareUrl || data?.inviteToken;
      if (url) {
        setInviteUrl(url);
        setHasInvited(true);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Link konnte nicht erstellt werden');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: 'Co-Host Einladung',
        text: 'Du wurdest als Co-Host eingeladen!',
        url: inviteUrl,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-app-fg mb-2"
        >
          Co-Hosts einladen 👥
        </motion.h2>
        <p className="text-app-muted">Co-Hosts können das Event mitverwalten und Fotos moderieren</p>
      </div>

      {eventId ? (
        <>
          {/* Email Invite */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-app-card rounded-2xl border-2 border-app-border p-5 space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-app-muted" />
              <span className="text-sm font-medium text-app-fg">Per E-Mail einladen</span>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && sendEmailInvite()}
                className="flex-1 px-3 py-2.5 text-sm border border-app-border rounded-lg bg-app-bg focus:outline-none focus:border-amber-400 transition-colors"
              />
              <Button
                onClick={sendEmailInvite}
                disabled={sending || !email.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-600"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-600 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> {success}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Invite Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-app-card rounded-2xl border-2 border-app-border p-5 space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-app-muted" />
              <span className="text-sm font-medium text-app-fg">Oder per Link teilen</span>
            </div>
            
            {inviteUrl ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-app-bg rounded-lg text-xs text-app-muted break-all font-mono">
                  {inviteUrl}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCopyLink} variant="outline" size="sm" className="flex-1 gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Kopiert!' : 'Kopieren'}
                  </Button>
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <Button onClick={handleShare} variant="outline" size="sm" className="flex-1 gap-1">
                      <Share2 className="w-3.5 h-3.5" />
                      Teilen
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Button
                onClick={generateInviteLink}
                disabled={sending}
                variant="outline"
                className="w-full gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Invite-Link erstellen
              </Button>
            )}
          </motion.div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-app-card rounded-2xl border-2 border-app-border p-6 text-center"
        >
          <UserPlus className="w-12 h-12 mx-auto text-app-muted mb-3" />
          <p className="text-app-muted">Co-Host Einladung wird nach Event-Erstellung verfügbar</p>
        </motion.div>
      )}

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-amber-50 border border-amber-100 rounded-xl p-4"
      >
        <p className="text-sm text-amber-700">
          💡 <strong>Tipp:</strong> Co-Hosts können Fotos freigeben, löschen und die Galerie verwalten — perfekt für Trauzeugen oder Eventplaner.
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="space-y-3"
      >
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button
            onClick={() => onNext(hasInvited)}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-app-muted hover:text-app-fg flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
