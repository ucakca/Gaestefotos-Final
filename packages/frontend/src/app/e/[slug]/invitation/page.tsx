'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType, Guest } from '@gaestefotos/shared';
import Envelope from '@/components/Envelope';
import Link from 'next/link';
import MapsLink from '@/components/MapsLink';

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [event, setEvent] = useState<EventType | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRSVPForm, setShowRSVPForm] = useState(false);
  const [rsvpData, setRsvpData] = useState({
    status: 'pending' as 'accepted' | 'declined' | 'pending',
    dietaryRequirements: '',
    plusOneCount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEvent();
    loadGuest();
  }, [slug]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/slug/${slug}`);
      setEvent(data.event);
    } catch (err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const loadGuest = async () => {
    try {
      // TODO: Load guest by access token from URL
      // For now, just load event
    } catch (err) {
      // Error handling
    }
  };

  const handleRSVP = async (status: 'accepted' | 'declined') => {
    if (!event) return;

    if (status === 'accepted') {
      setShowRSVPForm(true);
    } else {
      // Direct decline
      await submitRSVP({ ...rsvpData, status: 'declined' });
    }
  };

  const submitRSVP = async (data: typeof rsvpData) => {
    if (!event || !guest) return;

    setSubmitting(true);
    try {
      await api.put(`/events/${event.id}/guests/${guest.id}`, data);
      setRsvpData(data);
      setShowRSVPForm(false);
      // Show success message
    } catch (err: any) {
      alert('Fehler: ' + (err.response?.data?.error || 'Unbekannter Fehler'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Event nicht gefunden</div>
      </div>
    );
  }

  return (
    <Envelope>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-lg shadow-xl p-8 md:p-12 max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {event.title}
          </h1>
          
          {event.dateTime && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 mb-2"
            >
              {new Date(event.dateTime).toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </motion.p>
          )}

          {event.locationName && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 flex-wrap"
            >
              <p className="text-lg text-gray-600">
                📍 {event.locationName}
              </p>
              <MapsLink address={event.locationName} />
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-md mx-auto mb-8"
        >
          <p className="text-center text-gray-700 text-lg mb-6">
            Du bist herzlich eingeladen!
          </p>
          
          {/* RSVP Status */}
          {guest && guest.status !== 'pending' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200"
            >
              <p className="text-green-800 font-medium text-center">
                {guest.status === 'accepted' ? '✓ Du hast zugesagt' : 'Du hast abgesagt'}
              </p>
            </motion.div>
          )}

          {/* RSVP Buttons */}
          {(!guest || guest.status === 'pending') && !showRSVPForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRSVP('accepted')}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-semibold text-lg shadow-lg"
              >
                ✓ Zusage
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRSVP('declined')}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-lg"
              >
                Absage
              </motion.button>
            </motion.div>
          )}

          {/* RSVP Form */}
          <AnimatePresence>
            {showRSVPForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-6 bg-gray-50 rounded-lg space-y-4"
              >
                <h3 className="font-semibold text-gray-900 mb-4">Zusatzinformationen</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Essenswünsche / Allergien
                  </label>
                  <textarea
                    value={rsvpData.dietaryRequirements}
                    onChange={(e) => setRsvpData({ ...rsvpData, dietaryRequirements: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    rows={3}
                    placeholder="Vegetarisch, Vegan, Glutenfrei, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Begleitung (+1)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={rsvpData.plusOneCount}
                    onChange={(e) => setRsvpData({ ...rsvpData, plusOneCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  />
                </div>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowRSVPForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => submitRSVP({ ...rsvpData, status: 'accepted' })}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? 'Speichere...' : 'Bestätigen'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Link
            href={`/e/${slug}`}
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-lg"
          >
            Zur Event-Seite →
          </Link>
        </motion.div>
      </motion.div>
    </Envelope>
  );
}
