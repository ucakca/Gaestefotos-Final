'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

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
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-md w-full mx-4 bg-app-card border border-app-border rounded-lg shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-app-fg">Einladung versenden</h2>
          <DialogClose asChild>
            <IconButton
              onClick={onClose}
              icon={<X className="w-6 h-6" />}
              variant="ghost"
              size="sm"
              aria-label="Schließen"
              title="Schließen"
              className="text-app-muted hover:text-app-fg"
            />
          </DialogClose>
        </div>

        <div className="mb-4">
          <p className="text-app-muted mb-2">Gast: {guestName}</p>
          <label className="block text-sm font-medium text-app-fg mb-2">E-Mail-Adresse *</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md"
            placeholder="gast@example.com"
            required
          />
        </div>

        <div className="flex gap-3 justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose} className="px-4 py-2 rounded-md">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
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
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}















