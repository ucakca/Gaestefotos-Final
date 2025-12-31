'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check } from 'lucide-react';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface InviteModalProps {
  eventId: string;
  guestId: string;
  guestName: string;
  guestEmail?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InviteModal({
  eventId,
  guestId,
  guestName,
  guestEmail,
  onClose,
  onSuccess,
}: InviteModalProps) {
  const { showToast } = useToastStore();
  const [email, setEmail] = useState(guestEmail || '');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      showToast('Bitte E-Mail-Adresse eingeben', 'error');
      return;
    }

    setSending(true);
    try {
      await api.post(`/events/${eventId}/invite`, {
        guestId,
        guestEmail: email,
      });
      showToast('Einladung wurde versendet', 'success');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showToast(
        err.response?.data?.error || 'Fehler beim Versenden der Einladung',
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-app-fg/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-app-card border border-app-border rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-app-fg">Einladung versenden</h2>
            <button
              onClick={onClose}
              className="text-app-muted hover:text-app-fg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-app-muted mb-2">Gast: {guestName}</p>
            <label className="block text-sm font-medium text-app-fg mb-2">
              E-Mail-Adresse *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-app-border rounded-md text-app-fg bg-app-card"
              placeholder="gast@example.com"
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-app-border rounded-md text-app-fg bg-app-card hover:bg-app-bg"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-app-bg border-t-transparent rounded-full animate-spin" />
                  Wird versendet...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Versenden
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}















