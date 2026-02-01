'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, QrCode, Download, ExternalLink, Palette, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

  const handleDownloadQR = () => {
    if (eventId) {
      window.open(`/api/events/${eventId}/qr/export.pdf?format=A4`, '_blank');
    }
  };

  const handleOpenDesigner = () => {
    if (eventId) {
      // Open QR Designer in new window
      window.open(`/events/${eventId}/qr-styler`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          QR-Code erstellen 📱
        </motion.h2>
        <p className="text-gray-500">Gäste können den Code scannen und sofort Fotos hochladen</p>
      </div>

      {/* QR Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-gray-100 p-6 text-center"
      >
        {eventSlug ? (
          <>
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              {/* QR Code placeholder - will be replaced with actual QR */}
              <img 
                src={`/api/events/${eventId}/qr?size=200`} 
                alt="QR Code"
                className="w-40 h-40"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <QrCode className="w-32 h-32 text-gray-300" />
            </div>
            <p className="text-sm text-gray-600 mb-2">{qrUrl}</p>
            <Button
              onClick={handleDownloadQR}
              variant="ghost"
              size="sm"
              className="text-amber-600"
            >
              <Download className="w-4 h-4 mr-2" />
              QR-Code herunterladen
            </Button>
          </>
        ) : (
          <div className="py-8">
            <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">QR-Code wird nach Event-Erstellung verfügbar</p>
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
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-300 rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-purple-700 block">QR-Code Designer öffnen</span>
              <span className="text-xs text-purple-500">Logo, Farben & Formate anpassen</span>
            </div>
            <ExternalLink className="w-5 h-5 text-purple-400 group-hover:text-purple-600 transition-colors" />
          </button>
        </motion.div>
      )}

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="bg-amber-50 border border-amber-100 rounded-xl p-4"
      >
        <p className="text-sm text-amber-700">
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
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
