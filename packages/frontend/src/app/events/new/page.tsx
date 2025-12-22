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
      router.push(`/events/${data.event.id}`);
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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9F5F2' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#295B4D' }}>Neues Event erstellen</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1" style={{ color: '#295B4D' }}>
              Event-Titel *
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={handleTitleChange}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-gray-900 bg-white"
              style={{ 
                borderColor: '#EAA48F',
                color: '#295B4D',
              }}
              placeholder="z.B. Hochzeit von Maria und Max"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1" style={{ color: '#295B4D' }}>
              URL-Slug *
            </label>
            <input
              id="slug"
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-gray-900 bg-white"
              style={{ 
                borderColor: '#EAA48F',
                color: '#295B4D',
              }}
              placeholder="hochzeit-maria-max"
            />
            <p className="mt-1 text-sm text-gray-500">
              Event-URL: /e2/{formData.slug || 'event-slug'}
            </p>
          </div>

          <DateTimePicker
            label="Datum & Uhrzeit"
            value={formData.dateTime}
            onChange={(value) => setFormData({ ...formData, dateTime: value })}
          />

          <div>
            <label htmlFor="locationName" className="block text-sm font-medium mb-1" style={{ color: '#295B4D' }}>
              Veranstaltungsort / Adresse
            </label>
            <input
              id="locationName"
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all text-gray-900 bg-white"
              style={{ 
                borderColor: '#EAA48F',
                color: '#295B4D',
              }}
              placeholder="z.B. Musterstraße 123, 12345 Musterstadt oder Hotel Beispiel, Berlin"
            />
          </div>

          <div>
            <p className="text-sm" style={{ color: '#295B4D', opacity: 0.7 }}>
              💡 Die Adresse wird automatisch verwendet, um einen Karten-Link zu generieren, 
              der mit Google Maps und Apple Maps funktioniert.
            </p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-md font-medium transition-colors"
              style={{ borderColor: '#EAA48F', color: '#295B4D' }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#295B4D' }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#204a3e';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#295B4D';
              }}
            >
              {loading ? 'Erstellen...' : 'Event erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

