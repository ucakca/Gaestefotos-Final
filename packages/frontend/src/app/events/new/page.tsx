'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { slugify } from '@gaestefotos/shared';
import DateTimePicker from '@/components/DateTimePicker';

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    dateTime: '',
    locationName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      const { data } = await api.post('/events', {
        ...formData,
        dateTime: formData.dateTime || undefined,
        locationName: formData.locationName?.trim() || undefined,
      });
      router.push(`/events/${data.event.id}/design?wizard=1`);
    } catch (err: any) {
      console.error('Event creation error:', err);
      const errorData = err.response?.data;
      let errorMessage = 'Fehler beim Erstellen des Events';

      if (errorData?.code === 'FREE_EVENT_LIMIT_REACHED') {
        const limit = typeof errorData.limit === 'number' ? errorData.limit : 3;
        errorMessage = `Du hast das Limit von ${limit} kostenlosen Events erreicht. Bitte upgrade dein Paket, um weitere Events zu erstellen.`;
      }
      
      if (errorData) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (Array.isArray(errorData.error)) {
          // Zod validation errors
          errorMessage = errorData.error.map((e: any) => e.message || e).join(', ');
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-app-bg">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-tokens-brandGreen">Neues Event erstellen</h1>

        <form onSubmit={handleSubmit} className="bg-app-card border border-app-border shadow-lg rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-app-bg border border-[var(--status-danger)] text-[var(--status-danger)] px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1 text-tokens-brandGreen">
              Event-Titel *
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={handleTitleChange}
              className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:outline-none transition-all text-tokens-brandGreen bg-app-card focus:ring-tokens-brandGreen/30"
              placeholder="z.B. Hochzeit von Maria und Max"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1 text-tokens-brandGreen">
              URL-Slug *
            </label>
            <input
              id="slug"
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:outline-none transition-all text-tokens-brandGreen bg-app-card focus:ring-tokens-brandGreen/30"
              placeholder="hochzeit-maria-max"
            />
            <p className="mt-1 text-sm text-app-muted">
              Event-URL: /e2/{formData.slug || 'event-slug'}
            </p>
          </div>

          <DateTimePicker
            label="Datum & Uhrzeit"
            value={formData.dateTime}
            onChange={(value) => setFormData({ ...formData, dateTime: value })}
          />

          <div>
            <label htmlFor="locationName" className="block text-sm font-medium mb-1 text-tokens-brandGreen">
              Veranstaltungsort / Adresse
            </label>
            <input
              id="locationName"
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:outline-none transition-all text-tokens-brandGreen bg-app-card focus:ring-tokens-brandGreen/30"
              placeholder="z.B. Musterstraße 123, 12345 Musterstadt oder Hotel Beispiel, Berlin"
            />
          </div>

          <div>
            <p className="text-sm text-tokens-brandGreen/70">
              💡 Die Adresse wird automatisch verwendet, um einen Karten-Link zu generieren, 
              der mit Google Maps und Apple Maps funktioniert.
            </p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-app-accent rounded-md font-medium transition-colors text-tokens-brandGreen bg-app-card hover:bg-app-bg"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg text-app-bg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-tokens-brandGreen hover:opacity-90"
            >
              {loading ? 'Erstellen...' : 'Event erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

