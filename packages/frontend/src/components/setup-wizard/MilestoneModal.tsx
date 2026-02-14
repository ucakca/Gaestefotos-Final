'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PHASE_INFO, SetupPhase } from './types';
import { Button } from '@/components/ui/Button';

interface MilestoneModalProps {
  isOpen: boolean;
  phase: SetupPhase;
  eventTitle?: string;
  eventSlug?: string;
  onContinue: () => void;
  onViewEvent?: () => void;
}

export default function MilestoneModal({
  isOpen,
  phase,
  eventTitle,
  eventSlug,
  onContinue,
  onViewEvent,
}: MilestoneModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const phaseInfo = PHASE_INFO[phase];

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Load confetti dynamically
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#fb923c', '#fcd34d', '#fef3c7'],
        });
      }).catch(() => {
        // Confetti not available, that's ok
      });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Animated Icon */}
            <div className="pt-8 pb-4 flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="text-6xl"
              >
                {phaseInfo.icon}
              </motion.div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                {phaseInfo.milestone}
              </motion.h2>

              {phase === 1 && eventTitle && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-4"
                >
                  <p className="text-xl font-bold text-amber-600 mb-2">
                    "{eventTitle}"
                  </p>
                  {eventSlug && (
                    <p className="text-sm text-muted-foreground">
                      ist jetzt unter<br />
                      <a 
                        href={`/e3/${eventSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 px-3 py-1.5 bg-amber-50 text-amber-700 font-mono text-sm rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        app.gästefotos.com/e3/{eventSlug}
                      </a><br />
                      erreichbar.
                    </p>
                  )}
                </motion.div>
              )}

              {phase === 2 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-4"
                >
                  Dein Event hat jetzt einen einzigartigen Look!
                </motion.p>
              )}

              {phase === 3 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-4"
                >
                  Alben, Gästebuch und alle Optionen sind konfiguriert!
                </motion.p>
              )}

              {phase === 4 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-4"
                >
                  Co-Hosts können jetzt beim Event mithelfen!
                </motion.p>
              )}

              {phase === 5 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground mb-4"
                >
                  Dein Event ist komplett eingerichtet. Zeit zu feiern! 🎊
                </motion.p>
              )}

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                {phase === 1 && onViewEvent && (
                  <Button
                    onClick={onViewEvent}
                    variant="secondary"
                    className="w-full border-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                  >
                    Event ansehen →
                  </Button>
                )}
                
                <Button
                  onClick={onContinue}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {phase < 5 ? 'Weiter einrichten →' : 'Zum Dashboard →'}
                </Button>

                {phase === 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Du kannst jederzeit später weitermachen
                  </p>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
