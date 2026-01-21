'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FeatureKey, FEATURE_DESCRIPTIONS } from '@/hooks/usePackageFeatures';

interface PricingTier {
  key: string;
  name: string;
  price: string;
  priceDetail: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  icon: 'crown' | 'sparkles' | 'zap';
}

const PRICING_TIERS: PricingTier[] = [
  {
    key: 'free',
    name: 'Free',
    price: '0€',
    priceDetail: 'Kostenlos',
    description: 'Perfekt zum Ausprobieren',
    features: [
      'Bis zu 50 Fotos',
      '1 Album',
      'Grundlegende Features',
      'Community Support',
    ],
    cta: 'Aktueller Plan',
    icon: 'sparkles',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '19€',
    priceDetail: 'pro Event',
    description: 'Ideal für kleine Events',
    features: [
      'Bis zu 500 Fotos',
      'Unbegrenzte Alben',
      'Video-Upload',
      'Gästebuch',
      'QR-Code Designer',
      'ZIP-Download',
      'E-Mail Support',
    ],
    highlighted: true,
    cta: 'Jetzt starten',
    icon: 'zap',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '49€',
    priceDetail: 'pro Event',
    description: 'Für professionelle Events',
    features: [
      'Unbegrenzte Fotos',
      'Alle Starter-Features',
      'Co-Hosts',
      'Live-Wall',
      'Einladungsseiten',
      'Gesichtserkennung',
      'Prioritäts-Support',
      'Werbefrei',
    ],
    cta: 'Pro werden',
    icon: 'crown',
  },
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  triggerFeature?: FeatureKey;
  onSelectTier?: (tier: string) => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentTier = 'free',
  triggerFeature,
  onSelectTier,
}: UpgradeModalProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSelectTier = (tier: string) => {
    setSelectedTier(tier);
    if (onSelectTier) {
      onSelectTier(tier);
    }
  };

  const getIcon = (iconType: 'crown' | 'sparkles' | 'zap') => {
    switch (iconType) {
      case 'crown':
        return Crown;
      case 'sparkles':
        return Sparkles;
      case 'zap':
        return Zap;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <div className="bg-app-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-app-border">
              <div className="sticky top-0 bg-app-card border-b border-app-border px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-app-fg">Upgrade auf Pro</h2>
                  {triggerFeature && (
                    <p className="text-sm text-app-muted mt-1">
                      Schalte <strong>{FEATURE_DESCRIPTIONS[triggerFeature]?.name}</strong> frei
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-app-muted hover:text-app-fg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PRICING_TIERS.map((tier) => {
                    const Icon = getIcon(tier.icon);
                    const isCurrent = tier.key === currentTier;
                    const isSelected = selectedTier === tier.key;

                    return (
                      <motion.div
                        key={tier.key}
                        whileHover={{ scale: tier.highlighted ? 1.02 : 1 }}
                        className={`
                          relative rounded-xl border-2 p-6 transition-all
                          ${tier.highlighted
                            ? 'border-app-accent bg-gradient-to-br from-app-accent/5 to-transparent shadow-lg'
                            : 'border-app-border bg-app-bg'
                          }
                          ${isSelected ? 'ring-2 ring-app-accent' : ''}
                        `}
                      >
                        {tier.highlighted && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="bg-app-accent text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                              Beliebteste Wahl
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                          <Icon className={`w-6 h-6 ${tier.highlighted ? 'text-app-accent' : 'text-app-muted'}`} />
                          <h3 className="text-xl font-bold text-app-fg">{tier.name}</h3>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-app-fg">{tier.price}</span>
                            <span className="text-app-muted text-sm">{tier.priceDetail}</span>
                          </div>
                          <p className="text-sm text-app-muted mt-1">{tier.description}</p>
                        </div>

                        <ul className="space-y-3 mb-6">
                          {tier.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" />
                              <span className="text-app-fg">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => handleSelectTier(tier.key)}
                          disabled={isCurrent}
                          variant={tier.highlighted ? 'primary' : 'secondary'}
                          className="w-full"
                        >
                          {isCurrent ? 'Aktueller Plan' : tier.cta}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-8 text-center">
                  <p className="text-sm text-app-muted">
                    Alle Preise verstehen sich zzgl. MwSt. · Keine Mindestlaufzeit · Jederzeit kündbar
                  </p>
                  <a href="/pricing" className="text-sm text-app-accent hover:underline mt-2 inline-block">
                    Mehr Details zu den Paketen →
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
