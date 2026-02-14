'use client';

import React, { useState } from 'react';
import { 
  X, Download, Share2, Smartphone, Monitor, FileImage, 
  FileText, Instagram, MessageCircle, Mail, Link2, Check,
  Printer, Scissors, Info, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ExportFormat = 'png-standard' | 'png-instagram-story' | 'png-instagram-post' | 'png-whatsapp' | 'svg' | 'pdf';
type Tab = 'digital' | 'diy' | 'order';

interface ShareWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'pdf', options?: ExportOptions) => Promise<void>;
  onDiyExport: (format: string, svg: string) => Promise<void>;
  eventSlug: string;
  eventId: string;
  publicUrl: string;
  computedSvg: string;
  exporting: string | null;
}

interface ExportOptions {
  width?: number;
  height?: number;
  filename?: string;
}

const DIGITAL_FORMATS = [
  { key: 'png-standard', label: 'Standard PNG', desc: '1080×1080', icon: FileImage, width: 1080, height: 1080 },
  { key: 'png-instagram-story', label: 'Instagram Story', desc: '1080×1920', icon: Instagram, width: 1080, height: 1920 },
  { key: 'png-instagram-post', label: 'Instagram Post', desc: '1080×1080', icon: Instagram, width: 1080, height: 1080 },
  { key: 'png-whatsapp', label: 'WhatsApp', desc: '800×800 (komprimiert)', icon: MessageCircle, width: 800, height: 800 },
  { key: 'svg', label: 'Website Embed', desc: 'SVG (verlustfrei)', icon: Monitor, width: 0, height: 0 },
  { key: 'pdf', label: 'PDF Digital', desc: 'Zum Versenden', icon: FileText, width: 0, height: 0 },
];

const DIY_FORMATS = [
  { key: 'a6-tent', label: 'A6 Tischaufsteller', desc: 'Zum Falten', icon: Printer, format: 'A6' },
  { key: 'a5-tent', label: 'A5 Tischaufsteller', desc: 'Größer, stabiler', icon: Printer, format: 'A5' },
  { key: 'a4-poster', label: 'A4 Poster', desc: 'Für Wand/Staffelei', icon: FileImage, format: 'A4' },
  { key: 'cards', label: 'Visitenkarten', desc: '10 Stück pro A4', icon: Scissors, format: 'cards' },
];

export default function ShareWizardModal({ 
  isOpen, 
  onClose, 
  onExport,
  onDiyExport,
  eventSlug,
  eventId,
  publicUrl,
  computedSvg,
  exporting 
}: ShareWizardModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('digital');
  const [selectedFormat, setSelectedFormat] = useState<string>('png-standard');
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigitalExport = async (formatKey: string) => {
    setSelectedFormat(formatKey);
    const format = DIGITAL_FORMATS.find(f => f.key === formatKey);
    if (!format) return;

    try {
      if (formatKey === 'pdf') {
        await onExport('pdf');
      } else {
        await onExport('png', {
          width: format.width,
          height: format.height,
          filename: `qr-${eventSlug}-${formatKey}`,
        });
      }
      setDownloadSuccess(formatKey);
      setTimeout(() => setDownloadSuccess(null), 2000);
    } catch (err) {
      // Error handling is done in parent
    }
  };

  const handleDiyExport = async (formatKey: string) => {
    if (!computedSvg) return;

    try {
      await onDiyExport(formatKey, computedSvg);
      setDownloadSuccess(formatKey);
      setTimeout(() => setDownloadSuccess(null), 2000);
    } catch (err) {
      // Error handling is done in parent
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QR-Code für Event',
          text: 'Scanne diesen QR-Code um Fotos hochzuladen!',
          url: publicUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Copy failed
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Teilen & Drucken</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-app-surface transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { key: 'digital', label: '📱 Digital', desc: 'Social Media & Web' },
            { key: 'diy', label: '🖨️ Selbst drucken', desc: 'PDF Vorlagen' },
            { key: 'order', label: '📦 Bestellen', desc: 'Bald verfügbar' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              disabled={tab.key === 'order'}
              className={`flex-1 py-3 px-4 text-center transition-all ${
                activeTab === tab.key
                  ? 'bg-primary/10 border-b-2 border-primary text-primary'
                  : tab.key === 'order'
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-app-surface'
              }`}
            >
              <div className="font-medium text-sm">{tab.label}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Digital Tab */}
          {activeTab === 'digital' && (
            <div className="space-y-4">
              {/* Quick Share */}
              <div className="flex gap-2">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <Button
                    onClick={handleShare}
                    variant="secondary"
                    className="flex-1 gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Teilen
                  </Button>
                )}
                <Button
                  onClick={handleCopyLink}
                  variant="secondary"
                  className="flex-1 gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                  {copied ? 'Kopiert!' : 'Link kopieren'}
                </Button>
              </div>

              {/* Format Grid */}
              <div className="grid grid-cols-2 gap-3">
                {DIGITAL_FORMATS.map(format => {
                  const Icon = format.icon;
                  const isLoading = exporting === format.key;
                  const isSuccess = downloadSuccess === format.key;
                  
                  return (
                    <button
                      key={format.key}
                      onClick={() => handleDigitalExport(format.key)}
                      disabled={!!exporting}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        isSuccess
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      } ${exporting && !isLoading ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isSuccess ? 'bg-green-500/20' : 'bg-app-surface'}`}>
                          {isSuccess ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : isLoading ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">{format.label}</div>
                          <div className="text-xs text-muted-foreground">{format.desc}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DIY Tab */}
          {activeTab === 'diy' && (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <strong>Tipp:</strong> Drucke auf 300g/m² Karton für beste Ergebnisse. 
                  Faltlinien sind im PDF enthalten.
                </div>
              </div>

              {/* DIY Format Grid */}
              <div className="grid grid-cols-1 gap-3">
                {DIY_FORMATS.map(format => {
                  const Icon = format.icon;
                  const isLoading = exporting === format.key;
                  const isSuccess = downloadSuccess === format.key;
                  
                  return (
                    <button
                      key={format.key}
                      onClick={() => handleDiyExport(format.key)}
                      disabled={!!exporting}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        isSuccess
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      } ${exporting && !isLoading ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${isSuccess ? 'bg-green-500/20' : 'bg-app-surface'}`}>
                          {isSuccess ? (
                            <Check className="w-6 h-6 text-green-500" />
                          ) : isLoading ? (
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{format.label}</div>
                          <div className="text-sm text-muted-foreground">{format.desc}</div>
                        </div>
                        <Download className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Tab (Coming Soon) */}
          {activeTab === 'order' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-app-surface flex items-center justify-center mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Bald verfügbar!</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Bestelle fertige Tischaufsteller, Acryl-Displays und mehr direkt zu dir nach Hause.
              </p>
              <Button
                variant="secondary"
                className="mt-6 gap-2"
                onClick={() => window.open('mailto:info@gaestefotos.com?subject=Print-on-Demand Interesse', '_blank')}
              >
                <Mail className="w-4 h-4" />
                Interesse bekunden
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-app-surface/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>QR-Code URL: {publicUrl}</span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
