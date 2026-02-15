'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, X } from 'lucide-react';

interface ComboMultiplierProps {
  combo: number;
  isVisible: boolean;
  onTimeout?: () => void;
  timeout?: number;
}

export default function ComboMultiplier({ 
  combo, 
  isVisible, 
  onTimeout,
  timeout = 3000 
}: ComboMultiplierProps) {
  const [showFreeze, setShowFreeze] = useState(false);

  useEffect(() => {
    if (isVisible && combo >= 5) {
      setShowFreeze(true);
      const timer = setTimeout(() => {
        setShowFreeze(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [combo, isVisible]);

  useEffect(() => {
    if (isVisible && combo > 0) {
      const timer = setTimeout(() => {
        onTimeout?.();
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [isVisible, combo, timeout, onTimeout]);

  const getComboText = (n: number) => {
    if (n >= 10) return 'UNAUFHALTBAR!';
    if (n >= 7) return 'SENSATIONELL!';
    if (n >= 5) return 'FANTASTISCH!';
    if (n >= 3) return 'SUPER!';
    return '';
  };

  const getColor = (n: number) => {
    if (n >= 10) return 'from-purple-500 to-pink-500';
    if (n >= 7) return 'from-yellow-500 to-orange-500';
    if (n >= 5) return 'from-green-500 to-emerald-500';
    return 'from-blue-500 to-cyan-500';
  };

  return (
    <AnimatePresence>
      {isVisible && combo > 1 && (
        <motion.div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: -50, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: showFreeze && combo >= 5 ? [1, 1.1, 1] : 1,
          }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {/* Freeze Frame Effect */}
          {showFreeze && combo >= 5 && (
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"
              initial={{ scale: 0 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* Combo Card */}
          <motion.div
            className={`relative px-8 py-4 rounded-2xl bg-gradient-to-r ${getColor(combo)} shadow-2xl`}
            animate={combo >= 5 ? {
              boxShadow: [
                '0 0 20px rgba(255,255,255,0.3)',
                '0 0 40px rgba(255,255,255,0.5)',
                '0 0 20px rgba(255,255,255,0.3)',
              ],
            } : {}}
            transition={{ duration: 0.5, repeat: combo >= 5 ? Infinity : 0 }}
          >
            {/* Lightning Bolts */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: i === 0 ? '-20px' : i === 1 ? '50%' : 'calc(100% + 20px)',
                  top: '50%',
                  translateX: i === 1 ? '-50%' : '0',
                  translateY: '-50%',
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              >
                <Zap className={`w-6 h-6 text-white fill-white`} />
              </motion.div>
            ))}

            {/* Combo Number */}
            <div className="text-center">
              <motion.span
                className="text-6xl font-black text-white drop-shadow-lg"
                key={combo}
                initial={{ scale: 1.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                x{combo}
              </motion.span>
              
              {getComboText(combo) && (
                <motion.p
                  className="text-white font-bold text-lg mt-1 tracking-wider"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {getComboText(combo)}
                </motion.p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-2xl overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: timeout / 1000, ease: 'linear' }}
              />
            </div>
          </motion.div>

          {/* Screen Shake on High Combo */}
          {combo >= 10 && (
            <motion.div
              className="fixed inset-0 pointer-events-none"
              animate={{
                x: [0, -5, 5, -5, 5, 0],
                y: [0, 3, -3, 3, -3, 0],
              }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
