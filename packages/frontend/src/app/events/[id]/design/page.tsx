'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { useToastStore } from '@/store/toastStore';
import { Save, X, Download, Eye, Camera, Edit2, QrCode, Smartphone } from 'lucide-react';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import dynamic from 'next/dynamic';
import { DESIGN_PRESETS, getDesignPreset } from '@/lib/designPresets';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

function isWizardMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('wizard') === '1';
  } catch {
    return false;
  }
}

const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), {
  ssr: false,
});

export default function DesignLiveBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const wizardMode = isWizardMode();

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [qrCodeConfig, setQrCodeConfig] = useState({
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    size: 200,
    level: 'M' as 'L' | 'M' | 'Q' | 'H',
  });
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const logoImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);

      const nextDesignConfig = (data?.event?.designConfig as any) || {};
      const persistedQr = nextDesignConfig?.qrCodeConfig;
      if (persistedQr && typeof persistedQr === 'object') {
        setQrCodeConfig((prev) => ({
          fgColor: typeof persistedQr.fgColor === 'string' ? persistedQr.fgColor : prev.fgColor,
          bgColor: typeof persistedQr.bgColor === 'string' ? persistedQr.bgColor : prev.bgColor,
          size: typeof persistedQr.size === 'number' ? persistedQr.size : prev.size,
          level: ['L', 'M', 'Q', 'H'].includes(persistedQr.level) ? persistedQr.level : prev.level,
        }));
      }
    } catch (err) {
      console.error('Fehler beim Laden des Events:', err);
      showToast('Fehler beim Laden', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setUploadingImage('logo');
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/events/${eventId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await loadEvent();
      setUploadingImage(null);
      showToast('Logo erfolgreich hochgeladen', 'success');
    } catch {
      showToast('Fehler beim Hochladen', 'error');
      setUploadingImage(null);
    }
  };

  const handleImageUpload = async (type: 'profile' | 'cover', file: File) => {
    try {
      setUploadingImage(type);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/events/${eventId}/upload-${type}-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await loadEvent();
      setUploadingImage(null);
      showToast(`${type === 'profile' ? 'Profilbild' : 'Titelbild'} erfolgreich hochgeladen`, 'success');
    } catch (err: any) {
      showToast('Fehler beim Hochladen', 'error');
      setUploadingImage(null);
    }
  };

  const updateEventField = async (field: string, value: any) => {
    try {
      setSaving(true);
      await api.patch(`/events/${eventId}`, { [field]: value });
      await loadEvent();
      setEditingField(null);
      showToast('Änderungen gespeichert', 'success');
    } catch (err: any) {
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateDesignConfig = async (updates: any) => {
    try {
      setSaving(true);
      const designConfig = (event?.designConfig as any) || {};
      await api.patch(`/events/${eventId}`, {
        designConfig: { ...designConfig, ...updates },
      });
      await loadEvent();
      setEditingField(null);
      showToast('Design aktualisiert', 'success');
    } catch (err: any) {
      showToast('Fehler beim Aktualisieren', 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 200;
    canvas.height = 200;
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-code-${event?.slug || eventId}.png`;
      link.href = url;
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const saveQrCodeConfig = async () => {
    await updateDesignConfig({ qrCodeConfig });
  };

  const downloadA5StandeePdf = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const qrSizePx = 800;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    canvas.width = qrSizePx;
    canvas.height = qrSizePx;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, qrSizePx, qrSizePx);
      const qrPng = canvas.toDataURL('image/png');

      const w = window.open('', '_blank');
      if (!w) {
        showToast('Popup blockiert (bitte erlauben)', 'error');
        return;
      }

      const title = (event?.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const url = (typeof window !== 'undefined' ? `${window.location.origin}/e2/${event?.slug || ''}` : '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      w.document.open();
      w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Aufsteller A5</title>
    <style>
      @page { size: A5 portrait; margin: 0; }
      html, body { width: 148mm; height: 210mm; margin: 0; padding: 0; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
      .page { box-sizing: border-box; width: 148mm; height: 210mm; padding: 12mm; display: flex; flex-direction: column; justify-content: space-between; }
      .header { text-align: center; }
      .title { font-size: 18pt; font-weight: 800; margin: 0; }
      .subtitle { font-size: 11pt; margin: 6mm 0 0 0; color: #374151; }
      .qrWrap { display: flex; align-items: center; justify-content: center; margin: 10mm 0; }
      .qr { width: 92mm; height: 92mm; border: 2mm solid #111827; border-radius: 6mm; padding: 4mm; background: #fff; box-sizing: border-box; }
      .qr img { width: 100%; height: 100%; object-fit: contain; }
      .footer { text-align: center; font-size: 9pt; color: #6B7280; }
      .url { margin-top: 3mm; font-size: 9pt; word-break: break-all; color: #111827; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <p class="title">${title || 'Gästefotos'}</p>
        <p class="subtitle">Scanne den QR-Code und lade deine Fotos hoch</p>
      </div>
      <div class="qrWrap">
        <div class="qr">
          <img src="${qrPng}" alt="QR" />
        </div>
      </div>
      <div class="footer">
        <div>Keine App nötig • Einfach im Browser</div>
        <div class="url">${url}</div>
      </div>
    </div>
    <script>
      window.onload = () => { window.focus(); window.print(); };
    </script>
  </body>
</html>`);
      w.document.close();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  if (!event) {
    return <ErrorState message="Event nicht gefunden" />;
  }

  const designConfig = (event.designConfig as any) || {};
  const profileImage = designConfig.profileImage || null;
  const coverImage = designConfig.coverImage || null;
  const logoUrl = designConfig.logoUrl || null;
  const colors = (designConfig.colors as any) || {};
  const welcomeMessage = designConfig.welcomeMessage || '';
  const selectedPreset = getDesignPreset(designConfig.designPresetKey);
  const heroGradient = selectedPreset?.heroGradient || 'linear-gradient(90deg, #295B4D 0%, #EAA48F 100%)';
  const accentGradient = selectedPreset?.accentGradient || 'linear-gradient(135deg, #295B4D 0%, #EAA48F 100%)';
  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e2/${event.slug}`;

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="bg-app-bg">
        {/* Header */}
        <div className="bg-app-card border-b border-app-border sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">Design & Branding - Live Builder</h1>
            </div>
            <div className="flex items-center gap-2">
              {wizardMode && (
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <span className="text-xs font-semibold text-app-muted">Wizard:</span>
                  <span className="text-xs font-semibold text-tokens-brandGreen">1/2 Design</span>
                  <span className="text-xs text-app-muted">→</span>
                  <span className="text-xs font-semibold text-app-muted">2/2 Alben</span>
                </div>
              )}

              {wizardMode && (
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    onClick={() => router.push(`/events/${eventId}/categories?wizard=1`)}
                    className="bg-tokens-brandGreen text-app-bg hover:opacity-90"
                  >
                    Weiter
                  </Button>
                </motion.div>
              )}

              <motion.div whileTap={{ scale: 0.95 }}>
                <IconButton
                  icon={<Smartphone className="h-5 w-5" />}
                  variant="ghost"
                  size="sm"
                  aria-label={previewMode === 'mobile' ? 'Desktop-Vorschau' : 'Mobile Vorschau'}
                  onClick={() => setPreviewMode(previewMode === 'mobile' ? 'desktop' : 'mobile')}
                  className={previewMode === 'mobile' ? 'bg-app-fg text-app-bg' : 'bg-app-bg text-app-muted'}
                />
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }}>
                <IconButton
                  icon={<QrCode className="h-5 w-5" />}
                  variant="ghost"
                  size="sm"
                  aria-label={showQRCode ? 'QR schließen' : 'QR anzeigen'}
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="hover:bg-app-bg"
                />
              </motion.div>
              <a
                href={`/e2/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-app-bg rounded-lg"
              >
                <Eye className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview - Like Public Page */}
          <div className="lg:col-span-2">
            <div className="bg-app-card rounded-lg shadow-lg overflow-hidden">
              <div className={`bg-app-bg p-4 flex items-center justify-center ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
              }`}>
                <div className={`bg-app-card rounded-lg shadow-xl overflow-hidden ${
                  previewMode === 'mobile' ? 'w-full max-w-sm' : 'w-full'
                }`}>
                  {/* Public Event Preview - Like /e/[slug] */}
                  <div className="relative">
                    {/* Cover Image */}
                    <div 
                      className="relative w-full h-48 overflow-hidden group cursor-pointer"
                      style={!coverImage ? { backgroundImage: heroGradient } : undefined}
                      onClick={() => coverImageInputRef.current?.click()}
                    >
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-app-bg opacity-50">
                          <Camera className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-app-fg/0 group-hover:bg-app-fg/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        {uploadingImage === 'cover' ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-bg"></div>
                        ) : (
                          <div className="text-app-bg text-sm font-medium flex items-center gap-2">
                            <Edit2 className="w-4 h-4" />
                            Titelbild ändern
                          </div>
                        )}
                      </div>
                      <input
                        ref={coverImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('cover', file);
                        }}
                      />
                    </div>

                    {/* Profile Section */}
                    <div className="bg-app-bg pb-6">
                      <div className="max-w-md mx-auto px-4 -mt-12">
                        {/* Profile Image */}
                        <div 
                          className="relative mx-auto w-32 h-32 mb-4 cursor-pointer group"
                          onClick={() => profileImageInputRef.current?.click()}
                        >
                          <div className="absolute inset-0 rounded-full p-1" style={{ backgroundImage: accentGradient }}>
                            <div className="w-full h-full rounded-full bg-app-card flex items-center justify-center overflow-hidden">
                              {profileImage ? (
                                <img
                                  src={profileImage}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-app-bg flex items-center justify-center">
                                  <Camera className="w-16 h-16 text-tokens-brandGreen" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-app-fg/0 group-hover:bg-app-fg/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            {uploadingImage === 'profile' ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-app-bg"></div>
                            ) : (
                              <Edit2 className="w-6 h-6 text-app-bg" />
                            )}
                          </div>
                          <input
                            ref={profileImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload('profile', file);
                            }}
                          />
                        </div>

                        {/* Event Title */}
                        {editingField === 'title' ? (
                          <Input
                            type="text"
                            defaultValue={event.title}
                            onBlur={(e) => updateEventField('title', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateEventField('title', (e.target as HTMLInputElement).value);
                              }
                            }}
                            className="mb-3 h-auto border-x-0 border-t-0 border-b-2 border-app-fg bg-transparent px-0 py-0 text-center text-2xl font-bold text-app-fg shadow-none focus-visible:ring-0"
                            autoFocus
                          />
                        ) : (
                          <h2
                            onClick={() => setEditingField('title')}
                            className="text-center text-2xl font-bold text-app-fg mb-3 cursor-pointer hover:opacity-70 transition-opacity"
                          >
                            {event.title}
                          </h2>
                        )}

                        {/* Welcome Message */}
                        {editingField === 'welcomeMessage' ? (
                          <Textarea
                            defaultValue={welcomeMessage}
                            onBlur={(e) => updateDesignConfig({ welcomeMessage: e.target.value })}
                            placeholder="Schreibe eine Willkommensnachricht..."
                            className="min-h-0 resize-none border-2 border-app-fg bg-transparent text-center text-sm focus-visible:ring-0"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingField('welcomeMessage')}
                            className="text-center px-4 cursor-pointer hover:opacity-70 transition-opacity min-h-[60px] flex items-center justify-center"
                          >
                            {welcomeMessage ? (
                              <p className="text-app-fg text-sm leading-relaxed whitespace-pre-wrap">
                                {welcomeMessage}
                              </p>
                            ) : (
                              <p className="text-app-muted italic text-sm">
                                Klicke hier, um eine Willkommensnachricht hinzuzufügen...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <div className="bg-app-card rounded-lg shadow-lg p-6 space-y-6 sticky top-24">
              <h2 className="text-xl font-semibold">Einstellungen</h2>

              <div className="border-t border-app-border pt-6">
                <h3 className="font-semibold mb-3">Design Preset</h3>
                <div className="grid grid-cols-2 gap-2">
                  {DESIGN_PRESETS.map((p) => {
                    const isSelected = (designConfig.designPresetKey || 'classic') === p.key;
                    return (
                      <Button
                        key={p.key}
                        type="button"
                        variant="secondary"
                        onClick={() => updateDesignConfig({ designPresetKey: p.key })}
                        className={`h-auto w-full rounded-lg border p-2 text-left transition-colors ${
                          isSelected
                            ? 'border-app-fg bg-app-bg text-app-fg'
                            : 'border-app-border bg-app-card text-app-fg hover:border-app-muted'
                        }`}
                      >
                        <div className="h-10 w-full rounded-md" style={{ backgroundImage: p.heroGradient }} />
                        <div className="mt-2 text-xs font-semibold text-app-fg">{p.label}</div>
                      </Button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-app-muted">
                  Presets beeinflussen den Hero-Hintergrund und Akzente (z.B. Story-Ring) auf der Gast-Seite.
                </p>
              </div>

              <div className="border-t border-app-border pt-6">
                <h3 className="font-semibold mb-3">Branding</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-2">Logo</label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-28 rounded-lg border border-app-border bg-app-card flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[100px] object-contain" />
                        ) : (
                          <span className="text-xs text-app-muted">Kein Logo</span>
                        )}
                      </div>
                      <motion.div whileTap={{ scale: 0.95 }}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => logoImageInputRef.current?.click()}
                          className="bg-app-bg hover:opacity-90"
                          disabled={uploadingImage === 'logo'}
                        >
                          {uploadingImage === 'logo' ? 'Lädt…' : 'Logo hochladen'}
                        </Button>
                      </motion.div>
                      <input
                        ref={logoImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoUpload(file);
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-2">Farben</label>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-xs text-app-muted">Primary</div>
                        <input
                          type="color"
                          value={colors.primary || '#8B1538'}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, primary: e.target.value } })}
                          className="w-12 h-10 rounded border border-app-border cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={colors.primary || '#8B1538'}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, primary: e.target.value } })}
                          className="flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-24 text-xs text-app-muted">Secondary</div>
                        <input
                          type="color"
                          value={colors.secondary || '#FFFFFF'}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, secondary: e.target.value } })}
                          className="w-12 h-10 rounded border border-app-border cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={colors.secondary || '#FFFFFF'}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, secondary: e.target.value } })}
                          className="flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-24 text-xs text-app-muted">Accent</div>
                        <input
                          type="color"
                          value={colors.accent || '#EC4899'}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, accent: e.target.value } })}
                          className="w-12 h-10 rounded border border-app-border cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={colors.accent || '#EC4899'}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, accent: e.target.value } })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-app-muted">
                      Primary beeinflusst z.B. die Kopfzeile der Gast-Seite.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* QR Code Section */}
              {showQRCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-app-border pt-6"
                >
                  <h3 className="font-semibold mb-3">QR-Code Design</h3>
                  <div className="flex flex-col items-center gap-4">
                    {/* QR Code Preview */}
                    <div className="bg-app-card p-4 rounded-lg border-2 border-app-border">
                      <QRCodeSVG 
                        id="qr-code-svg"
                        value={eventUrl} 
                        size={qrCodeConfig.size}
                        fgColor={qrCodeConfig.fgColor}
                        bgColor={qrCodeConfig.bgColor}
                        level={qrCodeConfig.level}
                      />
                    </div>

                    {/* Design Options */}
                    <div className="w-full space-y-4">
                      {/* Foreground Color */}
                      <div>
                        <label className="block text-sm font-medium text-app-fg mb-2">
                          Vordergrundfarbe
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={qrCodeConfig.fgColor}
                            onChange={(e) => setQrCodeConfig({ ...qrCodeConfig, fgColor: e.target.value })}
                            className="w-12 h-10 rounded border border-app-border cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={qrCodeConfig.fgColor}
                            onChange={(e) => setQrCodeConfig({ ...qrCodeConfig, fgColor: e.target.value })}
                            className="flex-1"
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      {/* Background Color */}
                      <div>
                        <label className="block text-sm font-medium text-app-fg mb-2">
                          Hintergrundfarbe
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={qrCodeConfig.bgColor}
                            onChange={(e) => setQrCodeConfig({ ...qrCodeConfig, bgColor: e.target.value })}
                            className="w-12 h-10 rounded border border-app-border cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={qrCodeConfig.bgColor}
                            onChange={(e) => setQrCodeConfig({ ...qrCodeConfig, bgColor: e.target.value })}
                            className="flex-1"
                            placeholder="#FFFFFF"
                          />
                        </div>
                      </div>

                      {/* Size */}
                      <div>
                        <label className="block text-sm font-medium text-app-fg mb-2">
                          Größe: {qrCodeConfig.size}px
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="400"
                          step="10"
                          value={qrCodeConfig.size}
                          onChange={(e) => setQrCodeConfig({ ...qrCodeConfig, size: parseInt(e.target.value) })}
                          className="w-full accent-tokens-brandGreen"
                        />
                      </div>

                      {/* Error Correction Level */}
                      <div>
                        <label className="block text-sm font-medium text-app-fg mb-2">
                          Fehlerkorrektur
                        </label>
                        <select
                          value={qrCodeConfig.level}
                          onChange={(e) => setQrCodeConfig({ ...qrCodeConfig, level: e.target.value as any })}
                          className="w-full rounded-lg border border-app-border bg-app-card px-4 py-2.5 text-sm text-app-fg transition-colors focus:outline-none focus:ring-1 focus:ring-tokens-brandGreen/30 focus:border-tokens-brandGreen"
                        >
                          <option value="L">Niedrig (L)</option>
                          <option value="M">Mittel (M)</option>
                          <option value="Q">Hoch (Q)</option>
                          <option value="H">Sehr hoch (H)</option>
                        </select>
                        <p className="text-xs text-app-muted mt-1">
                          Höhere Stufen = mehr Fehlerkorrektur, aber größerer Code
                        </p>
                      </div>
                    </div>

                    <motion.div whileTap={{ scale: 0.95 }} className="w-full">
                      <Button
                        type="button"
                        onClick={downloadQRCode}
                        className="w-full bg-app-fg text-app-bg hover:opacity-90"
                      >
                        <Download className="w-4 h-4" />
                        QR-Code herunterladen
                      </Button>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.95 }} className="w-full">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={downloadA5StandeePdf}
                        className="w-full border border-app-border bg-app-card text-app-fg hover:opacity-90"
                      >
                        <Download className="w-4 h-4" />
                        Aufsteller (A5) als PDF
                      </Button>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.95 }} className="w-full">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={saveQrCodeConfig}
                        className="w-full bg-app-bg text-app-fg hover:opacity-90"
                      >
                        <Save className="w-4 h-4" />
                        QR-Einstellungen speichern
                      </Button>
                    </motion.div>
                    <p className="text-xs text-app-muted text-center">
                      Teilen Sie diesen QR-Code, damit Gäste direkt zum Event gelangen
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Event URL */}
              <div className="border-t border-app-border pt-6">
                <h3 className="font-semibold mb-2">Event-URL</h3>
                <div className="flex gap-2">
                  <Input type="text" value={eventUrl} readOnly className="flex-1 bg-app-bg" />
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(eventUrl);
                        showToast('URL kopiert', 'success');
                      }}
                      className="bg-app-bg hover:opacity-90"
                    >
                      Kopieren
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-app-border pt-6 space-y-2">
                <h3 className="font-semibold mb-2">Schnellaktionen</h3>
                <Button asChild type="button" variant="secondary" className="w-full bg-app-bg hover:opacity-90">
                  <a href={`/e2/${event.slug}`} target="_blank" rel="noopener noreferrer">
                    Öffentliche Seite öffnen
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Sticky Footer Navigation */}
        <DashboardFooter eventId={eventId} />
        
        {/* Padding for footer */}
        <div className="h-20" />
      </div>
    </AppLayout>
  );
}