'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { useToastStore } from '@/store/toastStore';
import { Save, X, Eye, Camera, QrCode, Smartphone } from 'lucide-react';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import { DESIGN_PRESETS, getDesignPreset } from '@/lib/designPresets';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ColorInput } from '@/components/ui/ColorInput';

function isWizardMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('wizard') === '1';
  } catch {
    return false;
  }
}

export default function DesignLiveBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => {
      setEventId(p.id);
      // Redirect to dashboard setup tab unless in wizard mode
      if (!isWizardMode()) {
        router.replace(`/events/${p.id}/dashboard?tab=setup`);
      }
    });
  }, [router]);
  const { showToast } = useToastStore();

  const wizardMode = isWizardMode();

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const logoImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (eventId) loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);

    } catch (err) {
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


  if (loading || !eventId) {
    return <FullPageLoader label="Lade..." />;
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
  const heroGradient =
    selectedPreset?.heroGradient || 'linear-gradient(90deg, var(--primary) 0%, var(--foreground) 100%)';
  const accentGradient =
    selectedPreset?.accentGradient || 'linear-gradient(135deg, var(--primary) 0%, var(--foreground) 100%)';
  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e2/${event.slug}`;

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="bg-background">
        {/* Modern Header */}
        <div className="bg-card border-b border-border sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Galerie-Design</h1>
              {wizardMode && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                    <span className="text-xs font-medium text-amber-600">Design</span>
                  </div>
                  <div className="w-6 h-px bg-border" />
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-border text-muted-foreground flex items-center justify-center text-[10px] font-bold">2</div>
                    <span className="text-xs text-muted-foreground">Kategorien</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(previewMode === 'mobile' ? 'desktop' : 'mobile')}
                className={`p-2 rounded-lg transition-colors ${previewMode === 'mobile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-background'}`}
                title={previewMode === 'mobile' ? 'Desktop-Vorschau' : 'Mobile Vorschau'}
              >
                <Smartphone className="w-5 h-5" />
              </button>
              <a href={`/e2/${event.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:bg-background rounded-lg transition-colors">
                <Eye className="w-5 h-5" />
              </a>
              {wizardMode && (
                <Button type="button" onClick={() => router.push(`/events/${eventId}/categories?wizard=1`)} variant="primary" className="ml-1">
                  Weiter →
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className={`bg-background p-6 flex items-center justify-center ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
              }`}>
                <div className={`bg-card rounded-2xl shadow-xl overflow-hidden ${
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
                        <div className="w-full h-full flex items-center justify-center text-background opacity-50">
                          <Camera className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        {uploadingImage === 'cover' ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-background"></div>
                        ) : (
                          <div className="text-background text-sm font-medium flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            Titelbild ändern
                          </div>
                        )}
                      </div>
                      <Input
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
                    <div className="bg-background pb-6">
                      <div className="max-w-md mx-auto px-4 -mt-12">
                        {/* Profile Image */}
                        <div 
                          className="relative mx-auto w-32 h-32 mb-4 cursor-pointer group"
                          onClick={() => profileImageInputRef.current?.click()}
                        >
                          <div className="absolute inset-0 rounded-full p-1" style={{ backgroundImage: accentGradient }}>
                            <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                              {profileImage ? (
                                <img
                                  src={profileImage}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-background flex items-center justify-center">
                                  <Camera className="w-16 h-16 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            {uploadingImage === 'profile' ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-background"></div>
                            ) : (
                              <Camera className="w-6 h-6 text-background" />
                            )}
                          </div>
                          <Input
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
                            className="mb-3 h-auto border-x-0 border-t-0 border-b-2 border-foreground bg-transparent px-0 py-0 text-center text-2xl font-bold text-foreground shadow-none focus-visible:ring-0"
                            autoFocus
                          />
                        ) : (
                          <h2
                            onClick={() => setEditingField('title')}
                            className="text-center text-2xl font-bold text-foreground mb-3 cursor-pointer hover:opacity-70 transition-opacity"
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
                            className="min-h-0 resize-none border-2 border-foreground bg-transparent text-center text-sm focus-visible:ring-0"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() => setEditingField('welcomeMessage')}
                            className="text-center px-4 cursor-pointer hover:opacity-70 transition-opacity min-h-[60px] flex items-center justify-center"
                          >
                            {welcomeMessage ? (
                              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {welcomeMessage}
                              </p>
                            ) : (
                              <p className="text-muted-foreground italic text-sm">
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

          {/* Settings Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Design Presets */}
            <div className="rounded-2xl border border-border bg-card p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-foreground mb-3">Design Preset</h3>
              <div className="grid grid-cols-2 gap-2">
                {DESIGN_PRESETS.map((p) => {
                  const isSelected = (designConfig.designPresetKey || 'classic') === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => updateDesignConfig({ designPresetKey: p.key, colors: p.colors })}
                      className={`rounded-xl border-2 p-2 transition-all ${
                        isSelected
                          ? 'border-primary shadow-md scale-[1.02]'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <div className="h-8 w-full rounded-lg" style={{ backgroundImage: p.heroGradient }} />
                      <div className="mt-1.5 text-[11px] font-medium text-foreground">{p.label}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Presets setzen Farben für Hero-Hintergrund und Akzente.
              </p>
            </div>

            {/* Branding */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Branding</h3>
              <div className="space-y-4">
                {/* Logo */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-24 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-h-8 max-w-[80px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Kein Logo</span>
                      )}
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => logoImageInputRef.current?.click()} disabled={uploadingImage === 'logo'}>
                      {uploadingImage === 'logo' ? 'Lädt…' : 'Hochladen'}
                    </Button>
                    <Input ref={logoImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); }} />
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Farben</label>
                  <div className="space-y-2">
                    {[
                      { key: 'primary', label: 'Primary', fallback: '#8B1538' },
                      { key: 'secondary', label: 'Secondary', fallback: '#FFFFFF' },
                      { key: 'accent', label: 'Akzent', fallback: '#EC4899' },
                    ].map(({ key, label, fallback }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-16 text-[11px] text-muted-foreground">{label}</span>
                        <ColorInput
                          value={colors[key] || fallback}
                          onChange={(value) => updateDesignConfig({ colors: { ...colors, [key]: value } })}
                        />
                        <Input
                          type="text"
                          value={colors[key] || fallback}
                          onChange={(e) => updateDesignConfig({ colors: { ...colors, [key]: e.target.value } })}
                          className="flex-1 h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code — Link to dedicated QR-Styler */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                QR-Code Designer
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Gestalte deinen QR-Code mit Logos, Farben, Rahmen und lade ihn als Druck-PDF herunter.
              </p>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => router.push(`/events/${eventId}/qr-styler`)}
                className="w-full gap-2"
              >
                <QrCode className="w-4 h-4" /> QR-Code Designer öffnen
              </Button>
            </div>

            {/* Event URL */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Event-URL</h3>
              <div className="flex gap-2">
                <Input type="text" value={eventUrl} readOnly className="flex-1 bg-background h-8 text-xs" />
                <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(eventUrl); showToast('URL kopiert', 'success'); }}>
                  Kopieren
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Sticky Footer Navigation */}
        <DashboardFooter eventId={eventId!} />
        
        {/* Padding for footer */}
        <div className="h-20" />
      </div>
    </AppLayout>
  );
}