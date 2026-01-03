'use client';

import { useEffect, useState } from 'react';
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

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    dateTime: '',
    locationName: '',
    designConfig: {} as any,
    featuresConfig: DEFAULT_EVENT_FEATURES_CONFIG,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvent();
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
    setSaving(true);

    try {
      await api.put(`/events/${eventId}`, {
        ...formData,
        dateTime: formData.dateTime || undefined,
        locationName: formData.locationName?.trim() || undefined,
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
