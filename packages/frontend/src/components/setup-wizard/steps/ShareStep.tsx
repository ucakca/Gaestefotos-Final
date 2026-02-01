'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Share2, Copy, Check, Mail, ExternalLink, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShareStepProps {
  eventSlug?: string;
  eventTitle: string;
  onNext: () => void;
  onBack: () => void;
}

export default function ShareStep({
  eventSlug,
  eventTitle,
  onNext,
  onBack,
}: ShareStepProps) {
  const [copied, setCopied] = useState(false);
  
  const eventUrl = eventSlug ? `https://app.gästefotos.com/e3/${eventSlug}` : '';
  const shareText = `Haltet die schönsten Momente von "${eventTitle}" fest! 📸\n\n${eventUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Main share handlers - ordered by EU prominence
  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleInstagram = () => {
    // Instagram doesn't have direct share URL, copy text and inform user
    navigator.clipboard.writeText(shareText);
    alert('Text kopiert! Öffne Instagram und füge den Text in deine Story oder einen Beitrag ein.');
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(`Einladung: ${eventTitle}`)}&body=${encodeURIComponent(shareText)}`, '_blank');
  };

  // Secondary share options
  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleMessenger = () => {
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(eventUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(eventUrl)}`, '_blank');
  };

  const handleSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url: eventUrl,
        });
      } catch (err) {
        // User cancelled
      }
    }
  };

  const handlePreview = () => {
    if (eventSlug) {
      window.open(`/e3/${eventSlug}`, '_blank');
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
          Event teilen 📤
        </motion.h2>
        <p className="text-gray-500">Lade deine Gäste ein!</p>
      </div>

      {/* Link Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-2xl p-4"
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Event-Link
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={eventUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none"
          />
          <Button
            onClick={handleCopy}
            variant="ghost"
            className={`px-4 ${copied ? 'text-green-600' : 'text-gray-600'}`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </Button>
        </div>
      </motion.div>

      {/* Preview Button */}
      {eventSlug && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={handlePreview}
            className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-300 rounded-xl transition-colors"
          >
            <Eye className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-700">Event-Seite Vorschau</span>
            <ExternalLink className="w-4 h-4 text-amber-500" />
          </button>
        </motion.div>
      )}

      {/* Main Share Options - Ordered by EU prominence */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <p className="text-sm font-medium text-gray-700">Direkt teilen:</p>
        
        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp - Most popular in EU */}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#25D366] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <span className="font-medium text-green-700">WhatsApp</span>
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#1877F2] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span className="font-medium text-blue-700">Facebook</span>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagram}
            className="flex items-center gap-3 p-4 bg-pink-50 hover:bg-pink-100 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span className="font-medium text-pink-700">Instagram</span>
          </button>

          {/* Email */}
          <button
            onClick={handleEmail}
            className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-gray-700">E-Mail</span>
          </button>
        </div>

        {/* More Options Toggle */}
        <button
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span className="text-sm">Mehr Optionen</span>
          {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Expanded Options */}
        <AnimatePresence>
          {showMoreOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* Telegram */}
                <button
                  onClick={handleTelegram}
                  className="flex items-center gap-3 p-3 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0088cc] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-sky-700">Telegram</span>
                </button>

                {/* Messenger */}
                <button
                  onClick={handleMessenger}
                  className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00B2FF] to-[#006AFF] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-purple-700">Messenger</span>
                </button>

                {/* SMS */}
                <button
                  onClick={handleSMS}
                  className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                      <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-green-700">SMS</span>
                </button>

                {/* Native Share (if available) */}
                {'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Mehr...</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-amber-50 border border-amber-100 rounded-xl p-4"
      >
        <p className="text-sm text-amber-700">
          💡 <strong>Tipp:</strong> Teile den Link in der Einladung oder drucke den QR-Code auf Tischkarten!
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3"
      >
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
      </motion.div>
    </div>
  );
}
