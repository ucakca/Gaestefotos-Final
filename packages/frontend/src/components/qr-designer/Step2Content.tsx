'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Step2ContentProps {
  headline: string;
  subline: string;
  eventName: string;
  callToAction: string;
  eventTitle: string;
  onHeadlineChange: (value: string) => void;
  onSublineChange: (value: string) => void;
  onEventNameChange: (value: string) => void;
  onCallToActionChange: (value: string) => void;
  onApplyPreset: (preset: string) => void;
}

const CONTENT_PRESETS = [
  {
    key: 'wedding',
    label: '💒 Hochzeit',
    headline: 'Unsere Hochzeit',
    subline: 'Teilt eure schönsten Momente',
    callToAction: 'QR-Code scannen & Fotos hochladen',
  },
  {
    key: 'birthday',
    label: '🎂 Geburtstag',
    headline: 'Geburtstagsparty',
    subline: 'Eure Fotos für unvergessliche Erinnerungen',
    callToAction: 'Jetzt scannen & Fotos teilen',
  },
  {
    key: 'company',
    label: '🏢 Firmenfeier',
    headline: 'Unser Team-Event',
    subline: 'Fotos & Videos sammeln',
    callToAction: 'QR scannen & hochladen',
  },
  {
    key: 'generic',
    label: '✨ Universal',
    headline: 'Unsere Fotogalerie',
    subline: 'Fotos & Videos sammeln',
    callToAction: 'QR-Code scannen & los gehts',
  },
];

export default function Step2Content({
  headline,
  subline,
  eventName,
  callToAction,
  eventTitle,
  onHeadlineChange,
  onSublineChange,
  onEventNameChange,
  onCallToActionChange,
  onApplyPreset,
}: Step2ContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Texte anpassen</h2>
        <p className="text-sm text-muted-foreground">
          Passe die Texte auf deinem QR-Aufsteller an. Nutze Presets für schnelle Vorlagen.
        </p>
      </div>

      {/* Content Presets */}
      <div className="bg-gradient-to-br from-app-accent/10 to-card rounded-lg border border-app-accent/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-app-accent" />
          <span className="text-sm font-semibold text-foreground">Schnelle Vorlagen</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CONTENT_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              onClick={() => {
                onHeadlineChange(preset.headline);
                onSublineChange(preset.subline);
                onCallToActionChange(preset.callToAction);
              }}
              variant="secondary"
              size="sm"
              className="text-xs font-medium h-auto py-2"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Text Fields */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-foreground">
            Headline
            <span className="text-muted-foreground font-normal ml-2">(Haupt-Überschrift)</span>
          </label>
          <Input
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            placeholder="z.B. Unsere Hochzeit"
            className="text-base"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-foreground">
            Subline
            <span className="text-muted-foreground font-normal ml-2">(Unter-Überschrift)</span>
          </label>
          <Input
            value={subline}
            onChange={(e) => onSublineChange(e.target.value)}
            placeholder="z.B. Teilt eure schönsten Momente"
            className="text-base"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-foreground">
            Eventname
            <span className="text-muted-foreground font-normal ml-2">(optional)</span>
          </label>
          <Input
            value={eventName}
            onChange={(e) => onEventNameChange(e.target.value)}
            placeholder={eventTitle || 'z.B. Sarah & Max'}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">Leer lassen um Event-Titel zu nutzen</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <label className="text-sm font-semibold text-foreground">
            Call to Action
            <span className="text-muted-foreground font-normal ml-2">(Handlungsaufforderung)</span>
          </label>
          <Input
            value={callToAction}
            onChange={(e) => onCallToActionChange(e.target.value)}
            placeholder="z.B. QR-Code scannen & los gehts"
            className="text-base"
          />
        </motion.div>
      </div>

      {/* Preview Note */}
      <div className="bg-background rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground text-center">
          💡 Tipp: Kurze, prägnante Texte funktionieren am besten auf QR-Aufstellern
        </p>
      </div>
    </div>
  );
}
