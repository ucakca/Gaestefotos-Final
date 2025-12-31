'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Guest, Event as EventType } from '@gaestefotos/shared';
import { Trash2, Mail, UserPlus } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

export default function GuestManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const [event, setEvent] = useState<EventType | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dietaryRequirements: '',
    plusOneCount: 0,
  });

  useEffect(() => {
    loadEvent();
    loadGuests();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      console.error('Fehler beim Laden des Events:', err);
    }
  };

  const loadGuests = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/guests`);
      setGuests(data.guests || []);
    } catch (err) {
      console.error('Fehler beim Laden der Gäste:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/events/${eventId}/guests`, formData);
      showToast('Gast hinzugefügt', 'success');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        dietaryRequirements: '',
        plusOneCount: 0,
      });
      setShowAddForm(false);
      loadGuests();
    } catch (err: any) {
      showToast('Fehler beim Hinzufügen', 'error');
    }
  };

  const handleDelete = async (guestId: string) => {
    if (!confirm('Gast wirklich löschen?')) return;

    try {
      await api.delete(`/events/${eventId}/guests/${guestId}`);
      showToast('Gast gelöscht', 'success');
      loadGuests();
    } catch (err: any) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'border border-[var(--status-success)] bg-app-bg text-[var(--status-success)]';
      case 'declined':
        return 'border border-[var(--status-danger)] bg-app-bg text-[var(--status-danger)]';
      default:
        return 'border border-[var(--status-warning)] bg-app-bg text-[var(--status-warning)]';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Zusage';
      case 'declined':
        return 'Absage';
      default:
        return 'Ausstehend';
    }
  };

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="text-tokens-brandGreen hover:opacity-90 mb-4"
          >
            ← Zurück
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-app-fg mb-2">
                Gäste-Verwaltung: {event?.title}
              </h1>
              <p className="text-app-muted">
                {guests.length} Gast{guests.length !== 1 ? 'e' : ''}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90 flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Gast hinzufügen
            </motion.button>
          </div>
        </motion.div>

        {/* Add Guest Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-app-card border border-app-border rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4 text-app-fg">Neuer Gast</h2>
              <form onSubmit={handleAddGuest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-1">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-app-border rounded-md text-app-fg bg-app-card"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-1">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-app-border rounded-md text-app-fg bg-app-card"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-md text-app-fg bg-app-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    Essenswünsche
                  </label>
                  <textarea
                    value={formData.dietaryRequirements}
                    onChange={(e) => setFormData({ ...formData, dietaryRequirements: e.target.value })}
                    className="w-full px-3 py-2 border border-app-border rounded-md text-app-fg bg-app-card"
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-app-border rounded-md bg-app-card hover:bg-app-bg"
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90"
                  >
                    Hinzufügen
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guests List */}
        <div className="bg-app-card border border-app-border rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-app-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  E-Mail
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Begleitung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-app-card divide-y divide-app-border">
              <AnimatePresence>
                {guests.map((guest, index) => (
                  <motion.tr
                    key={guest.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-app-fg">
                        {guest.firstName} {guest.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-app-muted">{guest.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(guest.status)}`}>
                        {getStatusText(guest.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-app-muted">
                      {guest.plusOneCount > 0 ? `+${guest.plusOneCount}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDelete(guest.id)}
                        className="text-[var(--status-danger)] hover:opacity-90"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {guests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-app-muted">Noch keine Gäste hinzugefügt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

