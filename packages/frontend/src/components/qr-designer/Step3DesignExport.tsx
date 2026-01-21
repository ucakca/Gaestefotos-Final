'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ColorInput } from '@/components/ui/ColorInput';
import { Button } from '@/components/ui/Button';
import { Download, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import LogoUpload from './LogoUpload';

type Preset = {
  key: string;
  label: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
};

interface Step3DesignExportProps {
  bgColor: string;
  textColor: string;
  accentColor: string;
  onBgColorChange: (value: string) => void;
  onTextColorChange: (value: string) => void;
  onAccentColorChange: (value: string) => void;
  presets: Preset[];
  onApplyPreset: (key: string) => void;
  onDownloadPng: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onDownloadSvg: () => void;
  exportingPng: boolean;
  exportingPdf: boolean;
  exportError: string | null;
  eventId: string;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  publicUrl: string;
}

export default function Step3DesignExport({
  bgColor,
  textColor,
  accentColor,
  onBgColorChange,
  onTextColorChange,
  onAccentColorChange,
  presets,
  onApplyPreset,
  onDownloadPng,
  onDownloadPdf,
  onDownloadSvg,
  exportingPng,
  exportingPdf,
  exportError,
  eventId,
  logoUrl,
  onLogoChange,
  publicUrl,
}: Step3DesignExportProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-app-fg mb-2">Design & Export</h2>
        <p className="text-sm text-app-muted">
          Passe die Farben an und lade deinen QR-Aufsteller als PNG oder PDF herunter.
        </p>
      </div>

      {/* Color Presets */}
      <div className="bg-gradient-to-br from-app-accent/10 to-app-card rounded-lg border border-app-accent/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-app-accent" />
          <span className="text-sm font-semibold text-app-fg">Farbschema-Vorlagen</span>
        </div>
        <Select onValueChange={onApplyPreset}>
          <SelectTrigger>
            <SelectValue placeholder="Preset auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color Pickers */}
      <div className="bg-app-card rounded-lg border border-app-border p-4">
        <label className="text-sm font-semibold text-app-fg mb-4 block">Farben anpassen</label>
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <label className="text-xs text-app-muted">Background</label>
            <ColorInput value={bgColor} onChange={onBgColorChange} className="w-full h-12" />
            <div className="text-xs text-app-muted font-mono">{bgColor}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <label className="text-xs text-app-muted">Text</label>
            <ColorInput value={textColor} onChange={onTextColorChange} className="w-full h-12" />
            <div className="text-xs text-app-muted font-mono">{textColor}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <label className="text-xs text-app-muted">Accent</label>
            <ColorInput value={accentColor} onChange={onAccentColorChange} className="w-full h-12" />
            <div className="text-xs text-app-muted font-mono">{accentColor}</div>
          </motion.div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-app-card rounded-lg border border-app-border p-4">
        <label className="text-sm font-semibold text-app-fg mb-3 block">Logo im QR-Code (optional)</label>
        <LogoUpload
          eventId={eventId}
          logoUrl={logoUrl}
          onLogoChange={onLogoChange}
          disabled={false}
        />
      </div>

      {/* Export Section */}
      <div className="bg-gradient-to-br from-app-accent/10 to-app-card rounded-lg border border-app-accent/20 p-6">
        <h3 className="text-lg font-bold text-app-fg mb-2">Download</h3>
        <p className="text-sm text-app-muted mb-4">
          Wähle das Format für deinen QR-Aufsteller. PNG ist ideal für digitale Nutzung, PDF für Druck.
        </p>

        <div className="space-y-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onDownloadPng}
              disabled={exportingPng}
              variant="primary"
              className="w-full h-12 text-base font-semibold"
            >
              <ImageIcon className="h-5 w-5" />
              {exportingPng ? 'Exportiere PNG…' : 'PNG herunterladen (Druckqualität)'}
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onDownloadPdf}
              disabled={exportingPdf}
              className="w-full h-12 text-base font-semibold bg-app-fg text-app-bg hover:opacity-90"
            >
              <FileText className="h-5 w-5" />
              {exportingPdf ? 'Exportiere PDF…' : 'PDF herunterladen (Druckerei)'}
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onDownloadSvg}
              variant="secondary"
              className="w-full h-12 text-base font-semibold"
            >
              <Download className="h-5 w-5" />
              SVG herunterladen (Vektor)
            </Button>
          </motion.div>
        </div>

        {exportError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-status-danger/10 border border-status-danger rounded-lg text-sm text-status-danger"
          >
            {exportError}
          </motion.div>
        )}
      </div>

      {/* QR Target Info */}
      <div className="bg-app-bg rounded-lg border border-app-border p-4">
        <label className="text-sm font-semibold text-app-fg mb-2 block">QR-Code Ziel-URL</label>
        <div className="text-xs text-app-muted break-all font-mono bg-app-card p-2 rounded">
          {publicUrl || 'Lade…'}
        </div>
      </div>
    </div>
  );
}
