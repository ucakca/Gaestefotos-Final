'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, SkipForward, Upload, Download, Shield, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FeaturesConfig } from '../types';

interface FeaturesStepProps {
  featuresConfig: FeaturesConfig;
  onFeaturesChange: (config: FeaturesConfig) => void;
  eventType: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const FEATURE_OPTIONS: { key: keyof FeaturesConfig; label: string; desc: string; icon: React.ElementType; recommended?: boolean; comingSoon?: boolean }[] = [
  { key: 'allowUploads', label: 'Foto-Uploads erlauben', desc: 'Gäste können Fotos & Videos hochladen', icon: Upload, recommended: true },
  { key: 'allowDownloads', label: 'Downloads erlauben', desc: 'Gäste können Fotos herunterladen', icon: Download, recommended: true },
  { key: 'moderationRequired', label: 'Moderation', desc: 'Fotos müssen erst freigegeben werden', icon: Shield },
  { key: 'mysteryMode', label: 'Mystery Mode', desc: 'Fotos werden erst nach dem Event sichtbar', icon: Eye },
  { key: 'showGuestlist', label: 'Gästeliste zeigen', desc: 'Alle Gäste können die Teilnehmerliste sehen', icon: Users, comingSoon: true },
];

export default function FeaturesStep({
  featuresConfig,
  onFeaturesChange,
  eventType,
  onNext,
  onBack,
  onSkip,
}: FeaturesStepProps) {
  const toggleFeature = (key: keyof FeaturesConfig) => {
    onFeaturesChange({ ...featuresConfig, [key]: !featuresConfig[key] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-app-fg mb-2"
        >
          Galerie-Optionen
        </motion.h2>
        <p className="text-app-muted">Bestimme wie deine Gäste die Galerie nutzen können</p>
      </div>

      {/* Feature Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {FEATURE_OPTIONS.map((feature, index) => {
          const Icon = feature.icon;
          const isEnabled = featuresConfig[feature.key];
          
          return (
            <motion.button
              key={feature.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => !feature.comingSoon && toggleFeature(feature.key)}
              disabled={feature.comingSoon}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                feature.comingSoon
                  ? 'border-app-border bg-app-bg/50 opacity-60 cursor-not-allowed'
                  : isEnabled
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-app-border bg-app-card hover:border-app-border/80'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                feature.comingSoon ? 'bg-app-bg text-app-muted' : isEnabled ? 'bg-amber-500 text-white' : 'bg-app-bg text-app-muted'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${feature.comingSoon ? 'text-app-muted' : isEnabled ? 'text-amber-800' : 'text-app-fg'}`}>
                    {feature.label}
                  </span>
                  {feature.comingSoon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      Coming Soon
                    </span>
                  )}
                  {feature.recommended && !feature.comingSoon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      Empfohlen
                    </span>
                  )}
                </div>
                <p className="text-sm text-app-muted">{feature.desc}</p>
              </div>
              {!feature.comingSoon && (
                <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
                  isEnabled ? 'bg-amber-500' : 'bg-app-border'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 border border-blue-100 rounded-xl p-4"
      >
        <p className="text-sm text-blue-700">
          Du kannst diese Einstellungen jederzeit im Dashboard ändern.
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
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
          className="w-full py-2 text-sm text-app-muted hover:text-app-fg flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
