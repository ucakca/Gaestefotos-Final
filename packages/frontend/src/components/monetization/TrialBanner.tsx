'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Clock, Gift } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TrialBannerProps {
  variant?: 'trial' | 'upgrade' | 'expiring';
  daysLeft?: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function TrialBanner({
  variant = 'upgrade',
  daysLeft,
  onUpgrade,
  onDismiss,
  dismissible = true,
}: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const bannerConfig = {
    trial: {
      icon: Gift,
      bgColor: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
      borderColor: 'border-purple-500/20',
      iconColor: 'text-purple-500',
      title: 'Teste Pro kostenlos!',
      description: '14 Tage alle Premium-Features ohne Risiko ausprobieren',
      cta: 'Jetzt starten',
    },
    upgrade: {
      icon: Sparkles,
      bgColor: 'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
      borderColor: 'border-amber-500/20',
      iconColor: 'text-amber-500',
      title: 'Upgrade auf Pro',
      description: 'Unbegrenzte Fotos, Co-Hosts, Live-Wall und mehr',
      cta: 'Jetzt upgraden',
    },
    expiring: {
      icon: Clock,
      bgColor: 'bg-gradient-to-r from-red-500/10 to-orange-500/10',
      borderColor: 'border-red-500/20',
      iconColor: 'text-red-500',
      title: daysLeft ? `Noch ${daysLeft} Tage Trial` : 'Trial läuft bald ab',
      description: 'Upgrade jetzt und behalte alle Features',
      cta: 'Jetzt sichern',
    },
  }[variant];

  const Icon = bannerConfig.icon;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`
            relative rounded-xl border-2 p-4
            ${bannerConfig.bgColor}
            ${bannerConfig.borderColor}
            backdrop-blur-sm
          `}
        >
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 ${bannerConfig.iconColor}`}>
              <Icon className="w-8 h-8" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-app-fg mb-1">
                {bannerConfig.title}
              </h3>
              <p className="text-sm text-app-muted">
                {bannerConfig.description}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onUpgrade && (
                <Button
                  onClick={onUpgrade}
                  variant="primary"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  {bannerConfig.cta}
                </Button>
              )}

              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-app-muted hover:text-app-fg transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
