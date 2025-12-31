'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { slugify } from '@gaestefotos/shared';
import { useToastStore } from '@/store/toastStore';
import DateTimePicker from '@/components/DateTimePicker';

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
    featuresConfig: {
      showGuestlist: true,
      mysteryMode: false,
      allowUploads: true,
      moderationRequired: false,
      allowDownloads: true,
    },
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
            dateTime: event.dateTime ? new Date(event.dateTime).toISOString() : '',
            locationName: event.locationName || '',
            designConfig: event.designConfig || {},
            featuresConfig: event.featuresConfig || {
              showGuestlist: true,
              mysteryMode: false,
              allowUploads: true,
              moderationRequired: false,
              allowDownloads: true,
            },
          });
    } catch (err: any) {
      console.error('Fehler beim Laden des Events:', err);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-app-bg">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8 text-tokens-brandGreen">Event bearbeiten</h1>

          <form onSubmit={handleSubmit} className="bg-app-card border border-app-border shadow-lg rounded-lg p-6 space-y-6">
            {error && (
              <div className="bg-app-bg border border-[var(--status-danger)] text-[var(--status-danger)] px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-tokens-brandGreen">
                Event-Titel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:outline-none transition-all text-tokens-brandGreen bg-app-card focus:ring-tokens-brandGreen/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-tokens-brandGreen">
                URL-Slug *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:outline-none transition-all text-tokens-brandGreen bg-app-card focus:ring-tokens-brandGreen/30"
              />
            </div>

            <DateTimePicker
              label="Datum & Uhrzeit"
              value={formData.dateTime}
              onChange={(value) => setFormData({ ...formData, dateTime: value })}
            />

            <div>
              <label className="block text-sm font-medium mb-1 text-tokens-brandGreen">
                Veranstaltungsort / Adresse
              </label>
              <input
                type="text"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:outline-none transition-all text-tokens-brandGreen bg-app-card focus:ring-tokens-brandGreen/30"
                placeholder="z.B. Musterstraße 123, 12345 Musterstadt oder Hotel Beispiel, Berlin"
              />
              <p className="mt-2 text-sm text-tokens-brandGreen/70">
                💡 Die Adresse wird automatisch verwendet, um einen Karten-Link zu generieren, 
                der mit Google Maps und Apple Maps funktioniert.
              </p>
            </div>

            {/* Feature Settings */}
            <div className="border-t border-app-border pt-6">
              <h3 className="text-lg font-semibold mb-4 text-app-fg">Einstellungen</h3>
              
              <div className="space-y-4 text-tokens-brandGreen">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featuresConfig.showGuestlist}
                    onChange={(e) => setFormData({
                      ...formData,
                      featuresConfig: { ...formData.featuresConfig, showGuestlist: e.target.checked }
                    })}
                    className="mr-2"
                    style={{ accentColor: 'var(--app-accent)', borderColor: 'var(--app-accent)' }}
                  />
                  <span>Gästeliste anzeigen</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featuresConfig.mysteryMode}
                    onChange={(e) => setFormData({
                      ...formData,
                      featuresConfig: { ...formData.featuresConfig, mysteryMode: e.target.checked }
                    })}
                    className="mr-2"
                    style={{ accentColor: 'var(--app-accent)', borderColor: 'var(--app-accent)' }}
                  />
                  <span>Mystery Mode (Fotos erst später sichtbar)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featuresConfig.allowUploads}
                    onChange={(e) => setFormData({
                      ...formData,
                      featuresConfig: { ...formData.featuresConfig, allowUploads: e.target.checked }
                    })}
                    className="mr-2"
                    style={{ accentColor: 'var(--app-accent)', borderColor: 'var(--app-accent)' }}
                  />
                  <span>Foto-Uploads erlauben</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featuresConfig.moderationRequired}
                    onChange={(e) => setFormData({
                      ...formData,
                      featuresConfig: { ...formData.featuresConfig, moderationRequired: e.target.checked }
                    })}
                    className="mr-2"
                    style={{ accentColor: 'var(--app-accent)', borderColor: 'var(--app-accent)' }}
                  />
                  <span>Moderation erforderlich</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featuresConfig.allowDownloads}
                    onChange={(e) => setFormData({
                      ...formData,
                      featuresConfig: { ...formData.featuresConfig, allowDownloads: e.target.checked }
                    })}
                    className="mr-2"
                    style={{ accentColor: 'var(--app-accent)', borderColor: 'var(--app-accent)' }}
                  />
                  <span>Downloads erlauben</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="px-4 py-2 border border-app-accent rounded-md font-medium transition-colors text-tokens-brandGreen bg-app-card hover:bg-app-bg"
              >
                Abbrechen
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={saving}
                className="px-6 py-3 rounded-lg text-app-bg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-tokens-brandGreen hover:opacity-90"
              >
                {saving ? 'Speichere...' : 'Speichern'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

