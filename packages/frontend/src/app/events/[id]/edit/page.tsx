'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { slugify } from '@gaestefotos/shared';
import { DEFAULT_EVENT_FEATURES_CONFIG, normalizeEventFeaturesConfig } from '@gaestefotos/shared';
import { useToastStore } from '@/store/toastStore';
import DateTimePicker from '@/components/DateTimePicker';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ColorSchemeSelector } from '@/components/ColorSchemeSelector';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);
  const { showToast } = useToastStore();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    dateTime: '',
    locationName: '',
    designConfig: {} as any,
    featuresConfig: DEFAULT_EVENT_FEATURES_CONFIG,
    wifiName: '',
    wifiPassword: '',
    wifiPasswordConfirm: '',
  });
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      const event = data.event;

      setFormData({
        title: event.title,
        slug: event.slug,
        dateTime: event.dateTime || '',
        locationName: event.locationName || '',
        designConfig: event.designConfig || {},
        featuresConfig: normalizeEventFeaturesConfig(event.featuresConfig || DEFAULT_EVENT_FEATURES_CONFIG) as any,
        wifiName: event.wifiName || '',
        wifiPassword: event.wifiPassword || '',
        wifiPasswordConfirm: event.wifiPassword || '',
      });
    } catch (err: any) {
      setError('Fehler beim Laden des Events');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: slugify(title),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate WiFi password confirmation
    if (formData.wifiPassword && formData.wifiPassword !== formData.wifiPasswordConfirm) {
      setError('WLAN-Passwörter stimmen nicht überein');
      showToast('WLAN-Passwörter stimmen nicht überein', 'error');
      return;
    }
    
    setSaving(true);

    try {
      await api.put(`/events/${eventId}`, {
        ...formData,
        dateTime: formData.dateTime || undefined,
        locationName: formData.locationName?.trim() || undefined,
        wifiName: formData.wifiName?.trim() || null,
        wifiPassword: formData.wifiPassword?.trim() || null,
      });
      showToast('Event erfolgreich aktualisiert', 'success');
      router.push(`/events/${eventId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-app-bg">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8 text-app-fg">Event bearbeiten</h1>

          <form onSubmit={handleSubmit} className="bg-app-card border border-app-border shadow-lg rounded-lg p-6 space-y-6">
            {error && (
              <div className="bg-app-bg border border-status-danger text-status-danger px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-app-fg">
                Event-Titel *
              </label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                className="px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-app-fg">
                URL-Slug *
              </label>
              <Input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="px-4 py-3"
              />
            </div>

            <DateTimePicker
              label="Datum & Uhrzeit"
              value={formData.dateTime}
              onChange={(value) => setFormData({ ...formData, dateTime: value })}
            />

            <div>
              <label className="block text-sm font-medium mb-1 text-app-fg">
                Veranstaltungsort / Adresse
              </label>
              <Input
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder="z.B. Musterstraße 123, 12345 Musterstadt oder Hotel Beispiel, Berlin"
                className="px-4 py-3"
              />
              <p className="mt-2 text-sm text-app-muted">
                💡 Die Adresse wird automatisch verwendet, um einen Karten-Link zu generieren, 
                der mit Google Maps und Apple Maps funktioniert.
              </p>
            </div>

            {/* Feature Settings */}
            <div className="border-t border-app-border pt-6">
              <h3 className="text-lg font-semibold mb-4 text-app-fg">Einstellungen</h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-app-fg">
                  <Checkbox
                    checked={formData.featuresConfig.showGuestlist}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        featuresConfig: { ...formData.featuresConfig, showGuestlist: checked },
                      })
                    }
                  />
                  <span>Gästeliste anzeigen</span>
                </label>

                <label className="flex items-center gap-2 text-app-fg">
                  <Checkbox
                    checked={formData.featuresConfig.mysteryMode}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        featuresConfig: { ...formData.featuresConfig, mysteryMode: checked },
                      })
                    }
                  />
                  <span>Mystery Mode (Fotos erst später sichtbar)</span>
                </label>

                <label className="flex items-center gap-2 text-app-fg">
                  <Checkbox
                    checked={formData.featuresConfig.allowUploads}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        featuresConfig: { ...formData.featuresConfig, allowUploads: checked },
                      })
                    }
                  />
                  <span>Foto-Uploads erlauben</span>
                </label>

                <label className="flex items-center gap-2 text-app-fg">
                  <Checkbox
                    checked={formData.featuresConfig.moderationRequired}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        featuresConfig: { ...formData.featuresConfig, moderationRequired: checked },
                      })
                    }
                  />
                  <span>Moderation erforderlich</span>
                </label>

                <label className="flex items-center gap-2 text-app-fg">
                  <Checkbox
                    checked={formData.featuresConfig.allowDownloads}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        featuresConfig: { ...formData.featuresConfig, allowDownloads: checked },
                      })
                    }
                  />
                  <span>Downloads erlauben</span>
                </label>
              </div>
            </div>

            {/* AI Color Scheme */}
            <div className="border-t border-app-border pt-6">
              <ColorSchemeSelector
                eventType="wedding"
                currentPrimary={formData.designConfig?.primaryColor}
                onSelect={(scheme) => {
                  setFormData({
                    ...formData,
                    designConfig: {
                      ...formData.designConfig,
                      primaryColor: scheme.primary,
                      secondaryColor: scheme.secondary,
                      accentColor: scheme.accent,
                      backgroundColor: scheme.background,
                    },
                  });
                }}
              />
            </div>

            {/* WiFi Settings */}
            <div className="border-t border-app-border pt-6">
              <h3 className="text-lg font-semibold mb-4 text-app-fg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                WLAN für Gäste
              </h3>
              <p className="text-sm text-app-muted mb-4">
                Teile dein WLAN mit deinen Gästen. Sie sehen einen Banner mit den Zugangsdaten.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-app-fg">
                    WLAN-Name (SSID)
                  </label>
                  <Input
                    type="text"
                    value={formData.wifiName}
                    onChange={(e) => setFormData({ ...formData, wifiName: e.target.value })}
                    placeholder="z.B. Hochzeit-Lisa-Max"
                    className="px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-app-fg">
                    WLAN-Passwort
                  </label>
                  <div className="relative">
                    <Input
                      type={showWifiPassword ? 'text' : 'password'}
                      value={formData.wifiPassword}
                      onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                      placeholder="z.B. party2026!"
                      className="px-4 py-3 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWifiPassword(!showWifiPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-fg"
                    >
                      {showWifiPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {formData.wifiPassword && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-app-fg">
                      Passwort bestätigen
                    </label>
                    <Input
                      type={showWifiPassword ? 'text' : 'password'}
                      value={formData.wifiPasswordConfirm}
                      onChange={(e) => setFormData({ ...formData, wifiPasswordConfirm: e.target.value })}
                      placeholder="Passwort erneut eingeben"
                      className={`px-4 py-3 ${formData.wifiPasswordConfirm && formData.wifiPassword !== formData.wifiPasswordConfirm ? 'border-red-500' : ''}`}
                    />
                    {formData.wifiPasswordConfirm && formData.wifiPassword !== formData.wifiPasswordConfirm && (
                      <p className="mt-1 text-sm text-red-500">Passwörter stimmen nicht überein</p>
                    )}
                  </div>
                )}
                <p className="text-sm text-app-muted">
                  💡 Leer lassen, wenn kein Passwort benötigt wird.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  onClick={() => router.back()}
                  variant="secondary"
                >
                  Abbrechen
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Speichere...' : 'Speichern'}
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
