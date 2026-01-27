'use client';

import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Wifi, X, Check } from 'lucide-react';

interface WifiNotificationProps {
  ssid: string;
  password: string;
  onDismiss?: () => void;
}

export default function WifiNotification({ ssid, password, onDismiss }: WifiNotificationProps) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      
      // Show "Kopiert!" for 2 seconds, then dismiss
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Swipe threshold: 100px horizontal movement
    if (Math.abs(info.offset.x) > 100) {
      handleDismiss();
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          onClick={!copied ? handleCopy : undefined}
          className="mx-4 mb-3 cursor-pointer select-none"
        >
          <div className={`
            relative overflow-hidden
            bg-gradient-to-r from-blue-500 to-blue-600
            rounded-2xl shadow-lg shadow-blue-500/20
            p-4 pr-10
            ${!copied ? 'active:scale-[0.98]' : ''}
            transition-transform
          `}>
            {/* X Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>

            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${copied ? 'bg-green-400' : 'bg-white/20'}
                transition-colors duration-300
              `}>
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="wifi"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Wifi className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="copied"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <p className="font-semibold text-white">Passwort kopiert!</p>
                      <p className="text-sm text-white/80">
                        Gehe zu Einstellungen → WLAN → {ssid}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="prompt"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <p className="font-semibold text-white">WLAN: {ssid}</p>
                      <p className="text-sm text-white/80">
                        Tippe hier um das Passwort zu kopieren
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Swipe hint indicator */}
            {!copied && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                <div className="w-8 h-1 bg-white/30 rounded-full" />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
