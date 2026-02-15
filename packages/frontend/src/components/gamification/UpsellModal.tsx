'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles, Zap, Crown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UpsellFeature {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  isNew?: boolean;
}

const UPSELL_FEATURES: UpsellFeature[] = [
  {
    id: 'mosaic-digital',
    name: 'Mosaic Wall Digital',
    description: 'Erstelle eine lebendige Fotowand mit Animationen',
    price: '199€',
    icon: <Sparkles className="w-5 h-5" />,
    isNew: true,
  },
  {
    id: 'mosaic-print',
    name: 'Mosaic Wall + Print',
    description: 'Inkl. Drucker, Tablet, Banner & Aufbau',
    price: '599€',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'photo-booth',
    name: 'Photo Booth',
    description: 'Professionelle Fotobox mit Sofortdruck',
    price: '449€',
    icon: <Crown className="w-5 h-5" />,
  },
];

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  onUpgrade?: (featureId: string) => void;
}

export default function UpsellModal({ isOpen, onClose, featureId, onUpgrade }: UpsellModalProps) {
  const feature = UPSELL_FEATURES.find((f) => f.id === featureId);

  if (!feature) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl mx-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.name}</h3>
                    {feature.isNew && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Neu
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Lock Badge */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Dieses Feature ist in deinem aktuellen Paket nicht enthalten
                </span>
              </div>

              {/* Description */}
              <p className="text-foreground mb-6">{feature.description}</p>

              {/* Price & CTA */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-foreground">{feature.price}</span>
                  <span className="text-sm text-muted-foreground"> / Event</span>
                </div>
                <Button
                  onClick={() => onUpgrade?.(featureId)}
                  className="gap-2"
                >
                  Jetzt upgraden
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Help Link */}
              <button className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Mehr erfahren
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
