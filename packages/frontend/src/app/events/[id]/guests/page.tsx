'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Guest, Event as EventType } from '@gaestefotos/shared';
import { Trash2, Mail, UserPlus, Upload, FileText } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function GuestManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }>(null);

  const confirmOpen = confirmState !== null;

  function requestConfirm(opts: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(opts);
    });
  }

  function closeConfirm(result: boolean) {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmState(null);
    resolve?.(result);
  }

  const [event, setEvent] = useState<EventType | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
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
      void err;
    }
  };

  const loadGuests = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/guests`);
      setGuests(data.guests || []);
    } catch (err) {
      void err;
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

  const handleImportGuests = async () => {
    if (!importText.trim()) {
      showToast('Bitte Gästeliste eingeben', 'error');
      return;
    }
    
    setImporting(true);
    const lines = importText.split('\n').filter(line => line.trim());
    let added = 0;
    let failed = 0;
    
    for (const line of lines) {
      // Parse: "Vorname Nachname, email@example.com" or "Vorname Nachname" or "email@example.com"
      const parts = line.split(',').map(p => p.trim());
      let firstName = '';
      let lastName = '';
      let email = '';
      
      if (parts.length >= 2) {
        // "Name, Email" format
        const nameParts = parts[0].split(' ').filter(Boolean);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        email = parts[1] || '';
      } else if (parts[0].includes('@')) {
        // Just email
        email = parts[0];
        firstName = parts[0].split('@')[0];
      } else {
        // Just name
        const nameParts = parts[0].split(' ').filter(Boolean);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      if (!firstName && !email) {
        failed++;
        continue;
      }
      
      try {
        await api.post(`/events/${eventId}/guests`, {
          firstName: firstName || 'Gast',
          lastName,
          email,
          dietaryRequirements: '',
          plusOneCount: 0,
        });
        added++;
      } catch {
        failed++;
      }
    }
    
    setImporting(false);
    setImportText('');
    setShowImportForm(false);
    showToast(`${added} Gäste importiert${failed > 0 ? `, ${failed} fehlgeschlagen` : ''}`, added > 0 ? 'success' : 'error');
    loadGuests();
  };

  const handleDelete = async (guestId: string) => {
    const ok = await requestConfirm({
      title: 'Gast wirklich löschen?',
      description: 'Kann nicht rückgängig gemacht werden.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

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
        return 'border border-status-success bg-app-bg text-status-success';
      case 'declined':
        return 'border border-status-danger bg-app-bg text-status-danger';
      default:
        return 'border border-status-warning bg-app-bg text-status-warning';
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
    <AlertDialog open={confirmOpen} onOpenChange={(open) => (open ? null : closeConfirm(false))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
          {confirmState?.description ? (
            <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelText || 'Abbrechen'}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="danger" onClick={() => closeConfirm(true)}>
              {confirmState?.confirmText || 'Bestätigen'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      <div className="min-h-screen bg-app-bg">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button type="button" variant="ghost" onClick={() => router.back()} className="mb-4">
            ← Zurück
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-app-fg mb-2">
                Gäste-Verwaltung: {event?.title}
              </h1>
              <p className="text-app-muted">
                {guests.length} Gast{guests.length !== 1 ? 'e' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  onClick={() => { setShowImportForm(!showImportForm); setShowAddForm(false); }}
                  variant="secondary"
                >
                  <Upload className="h-5 w-5" />
                  Importieren
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  type="button"
                  onClick={() => { setShowAddForm(!showAddForm); setShowImportForm(false); }}
                  variant="primary"
                >
                  <UserPlus className="h-5 w-5" />
                  Hinzufügen
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Import Guests Form */}
        <AnimatePresence>
          {showImportForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-app-card border border-app-border rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-2 text-app-fg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gäste importieren
              </h2>
              <p className="text-sm text-app-muted mb-4">
                Füge mehrere Gäste auf einmal hinzu. Ein Gast pro Zeile.
              </p>
              
              <div className="mb-4 p-3 rounded-lg bg-app-bg border border-app-border">
                <div className="text-xs font-medium text-app-fg mb-1">Unterstützte Formate:</div>
                <div className="text-xs text-app-muted space-y-1">
                  <div>• <code>Vorname Nachname, email@example.com</code></div>
                  <div>• <code>Vorname Nachname</code></div>
                  <div>• <code>email@example.com</code></div>
                </div>
              </div>
              
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Max Mustermann, max@example.com\nAnna Schmidt\nmaria@example.com`}
                rows={8}
                className="font-mono text-sm"
              />
              
              <div className="flex gap-4 mt-4">
                <Button type="button" variant="secondary" onClick={() => setShowImportForm(false)}>
                  Abbrechen
                </Button>
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleImportGuests}
                  disabled={importing || !importText.trim()}
                >
                  {importing ? 'Importiere...' : `${importText.split('\n').filter(l => l.trim()).length} Gäste importieren`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    <Input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-fg mb-1">
                      Nachname *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    E-Mail
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    Essenswünsche
                  </label>
                  <Textarea
                    value={formData.dietaryRequirements}
                    onChange={(e) => setFormData({ ...formData, dietaryRequirements: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                      Abbrechen
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="submit" variant="primary">
                      Hinzufügen
                    </Button>
                  </motion.div>
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
                      <IconButton
                        icon={<Trash2 className="h-5 w-5" />}
                        variant="ghost"
                        size="sm"
                        aria-label="Gast löschen"
                        title="Gast löschen"
                        onClick={() => handleDelete(guest.id)}
                        className="text-status-danger"
                      />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {guests.length === 0 && (
            <div className="p-6 text-sm text-app-muted">Noch keine Gäste vorhanden.</div>
          )}
        </div>
      </div>
    </div>
    </AlertDialog>
  );
}
