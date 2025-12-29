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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Einladung versenden</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-2">Gast: {guestName}</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
              placeholder="gast@example.com"
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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















