'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, QrCode, Download, ExternalLink, Palette, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface QRCodeStepProps {
  eventId?: string;
  eventSlug?: string;
  eventType: string;
  eventTitle: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function QRCodeStep({
  eventId,
  eventSlug,
  eventType,
  eventTitle,
  onNext,
  onBack,
  onSkip,
}: QRCodeStepProps) {
  const qrUrl = eventSlug ? `https://app.gästefotos.com/e3/${eventSlug}` : '';
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError, setQrError] = useState(false);

  const handleDownloadQR = async () => {
    if (!eventId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/events/${eventId}/qr?size=800`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-code-${eventSlug || eventId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open QR styler
      window.open(`/events/${eventId}/qr-styler`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenDesigner = () => {
    if (eventId) {
      router.push(`/events/${eventId}/qr-styler?from=wizard`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          QR-Code erstellen 📱
        </motion.h2>
        <p className="text-muted-foreground">Gäste können den Code scannen und sofort Fotos hochladen</p>
      </div>

      {/* QR Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border-2 border-border p-6 text-center"
      >
        {eventSlug ? (
          <>
            <div className="w-48 h-48 mx-auto bg-background rounded-xl flex items-center justify-center mb-4">
              {!qrError && (
                <img 
                  src={`/api/events/${eventId}/qr?size=200`} 
                  alt="QR Code"
                  className="w-40 h-40"
                  onLoad={() => setQrLoaded(true)}
                  onError={() => setQrError(true)}
                />
              )}
              {(qrError || !qrLoaded) && <QrCode className="w-32 h-32 text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{qrUrl}</p>
            <Button
              onClick={handleDownloadQR}
              variant="ghost"
              size="sm"
              className="text-warning"
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {downloading ? 'Wird heruntergeladen...' : 'QR-Code herunterladen'}
            </Button>
          </>
        ) : (
          <div className="py-8">
            <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">QR-Code wird nach Event-Erstellung verfügbar</p>
          </div>
        )}
      </motion.div>

      {/* QR Designer Button */}
      {eventId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleOpenDesigner}
            className="w-full flex items-center justify-center gap-3 p-4 bg-purple-500/10 border-2 border-purple-500/20 hover:border-purple-500/30 rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-foreground block">QR-Code Designer öffnen</span>
              <span className="text-xs text-muted-foreground">Logo, Farben & Formate anpassen</span>
            </div>
            <ExternalLink className="w-5 h-5 text-purple-500 group-hover:text-purple-400 transition-colors" />
          </button>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="bg-warning/10 border border-warning/20 rounded-xl p-4"
      >
        <p className="text-sm text-foreground">
          💡 <strong>Tipp:</strong> Drucke den QR-Code auf Tischkarten, Plakate oder Einladungen. 
          Im Designer kannst du Farben, Logo und Format individuell anpassen.
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-warning hover:opacity-90 text-warning-foreground"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
