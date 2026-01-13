'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { Plus, Trash2, Edit2, X, Trophy, Copy, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
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

interface Category {
  id: string;
  name: string;
}

interface Challenge {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  isActive: boolean;
  isVisible: boolean;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  completions?: Array<{
    id: string;
    photo: {
      id: string;
      url: string;
    };
    guest?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    uploaderName?: string;
    averageRating?: number;
    ratingCount?: number;
  }>;
}

export default function ChallengeManagementPage() {
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 0,
    isActive: true,
    isVisible: true,
    categoryId: null as string | null,
  });

  useEffect(() => {
    loadEvent();
    loadCategories();
    loadChallenges();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      void err;
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`);
      setCategories(data.categories || []);
    } catch (err) {
      void err;
    }
  };

  const loadChallenges = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/challenges`);
      setChallenges(data.challenges || []);
    } catch (err) {
      void err;
    }
  };

  const handleAddChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/events/${eventId}/challenges`, formData);
      showToast('Challenge hinzugefügt', 'success');
      setFormData({
        title: '',
        description: '',
        order: 0,
        isActive: true,
        isVisible: true,
        categoryId: null,
      });
      setShowAddForm(false);
      loadChallenges();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Fehler beim Hinzufügen';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const handleUpdateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    try {
      await api.put(`/events/${eventId}/challenges/${editingChallenge.id}`, formData);
      showToast('Challenge aktualisiert', 'success');
      setEditingChallenge(null);
      setFormData({
        title: '',
        description: '',
        order: 0,
        isActive: true,
        isVisible: true,
        categoryId: null,
      });
      loadChallenges();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Fehler beim Aktualisieren';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    const ok = await requestConfirm({
      title: 'Challenge wirklich löschen?',
      description: 'Kann nicht rückgängig gemacht werden.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;
    try {
      await api.delete(`/events/${eventId}/challenges/${challengeId}`);
      showToast('Challenge gelöscht', 'success');
      loadChallenges();
    } catch (err: any) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleCopyChallenge = async (challengeId: string) => {
    try {
      const otherCategories = categories
        .filter(c => c.id !== challenges.find(ch => ch.id === challengeId)?.categoryId)
        .map(c => c.id);
      
      if (otherCategories.length === 0) {
        showToast('Keine anderen Alben vorhanden', 'info');
        return;
      }
      
      await api.post(`/events/${eventId}/challenges/${challengeId}/copy`, {
        categoryIds: otherCategories,
      });
      showToast('Challenge kopiert', 'success');
      loadChallenges();
    } catch (err: any) {
      showToast('Fehler beim Kopieren', 'error');
    }
  };

  const startEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description || '',
      order: challenge.order,
      isActive: challenge.isActive,
      isVisible: challenge.isVisible,
      categoryId: challenge.categoryId || null,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingChallenge(null);
    setFormData({
      title: '',
      description: '',
      order: 0,
      isActive: true,
      isVisible: true,
      categoryId: null,
    });
  };

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  const featuresConfig = (event?.featuresConfig as any) || {};
  const challengesEnabled = featuresConfig.challengesEnabled === true;

  // Separate challenges by type
  const globalChallenges = challenges.filter(c => !c.categoryId);
  const albumChallenges = challenges.filter(c => c.categoryId);

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
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
      </AlertDialog>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-app-fg mb-2">
                Challenges
              </h1>
              <p className="text-app-muted">
                {event?.title} • {challenges.length} Challenge{challenges.length !== 1 ? 's' : ''}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={() => {
                  setShowAddForm(true);
                  setEditingChallenge(null);
                  setFormData({
                    title: '',
                    description: '',
                    order: 0,
                    isActive: true,
                    isVisible: true,
                    categoryId: null,
                  });
                }}
                icon={<Plus className="h-5 w-5" />}
                variant="ghost"
                size="lg"
                disabled={!challengesEnabled}
                aria-label="Challenge hinzufügen"
                title="Challenge hinzufügen"
                className={challengesEnabled ? 'bg-app-accent hover:bg-app-accent/90 text-app-bg' : 'bg-app-border text-app-muted cursor-not-allowed'}
              />
            </motion.div>
          </div>
        </motion.div>

        {!challengesEnabled && (
          <div className="bg-app-card border border-app-border rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-app-fg">
              <Trophy className="w-5 h-5" />
              <p className="font-medium">Challenges sind deaktiviert</p>
            </div>
            <p className="text-sm text-app-muted mt-1">
              Aktiviere Challenges in den erweiterten Einstellungen, um sie zu verwenden.
            </p>
          </div>
        )}

        {/* Add/Edit Form */}
        <AnimatePresence>
          {(showAddForm || editingChallenge) && challengesEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-app-card rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4">
                {editingChallenge ? 'Challenge bearbeiten' : 'Neue Challenge'}
              </h2>
              
              {!editingChallenge && (
                <div className="mb-4 p-4 rounded-lg bg-app-bg border border-app-border">
                  <p className="text-xs font-semibold text-app-fg mb-2">💡 Vorlagen - Klicken zum Übernehmen</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { title: 'Bestes Gruppenfoto', desc: 'Zeigt euer schönstes Gruppenbild!' },
                      { title: 'Lustigster Moment', desc: 'Der witzigste Augenblick des Events' },
                      { title: 'Schönstes Paar-Foto', desc: 'Das romantischste Foto des Abends' },
                      { title: 'Action-Shot', desc: 'Dynamik pur - zeigt Bewegung!' },
                      { title: 'Bestes Selfie', desc: 'Euer coolstes Selfie' },
                      { title: 'Kreativstes Foto', desc: 'Überrascht uns mit Kreativität!' },
                    ].map((template) => (
                      <Button
                        key={template.title}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setFormData({ ...formData, title: template.title, description: template.desc })}
                        className="text-xs"
                      >
                        {template.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={editingChallenge ? handleUpdateChallenge : handleAddChallenge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    Titel *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="z.B. Bestes Paar-Foto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    Beschreibung
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Optionale Beschreibung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-fg mb-1">
                    Album zuweisen (leer = globale Challenge)
                  </label>
                  <Select
                    value={formData.categoryId || ''}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Globale Challenge" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Globale Challenge</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <span className="text-sm text-app-fg">Aktiv</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.isVisible}
                        onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                      />
                      <span className="text-sm text-app-fg">Foto sichtbar</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t border-app-border">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowAddForm(false);
                        cancelEdit();
                      }}
                    >
                      Abbrechen
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="submit" variant="primary" className="shadow-sm">
                      {editingChallenge ? 'Speichern' : 'Hinzufügen'}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Challenges */}
        {globalChallenges.length > 0 && (
          <div className="bg-app-card rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-app-fg" />
                Globale Challenges
              </h2>
            </div>
            <div className="space-y-3">
              {globalChallenges.map((challenge) => (
                <div key={challenge.id} className="bg-app-bg rounded-lg p-4 border border-app-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-status-warning" />
                        <span className="font-semibold">{challenge.title}</span>
                        {!challenge.isActive && (
                          <span className="text-xs text-app-muted bg-app-border px-2 py-0.5 rounded">Inaktiv</span>
                        )}
                      </div>
                      {challenge.description && (
                        <p className="text-sm text-app-muted mb-2">{challenge.description}</p>
                      )}
                      <div className="text-xs text-app-muted">
                        {challenge.completions?.length || 0} Erfüllung(en)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <IconButton
                        icon={<Edit2 className="h-4 w-4" />}
                        variant="ghost"
                        size="sm"
                        aria-label="Challenge bearbeiten"
                        title="Challenge bearbeiten"
                        onClick={() => startEdit(challenge)}
                        className="text-app-fg"
                      />
                      <IconButton
                        icon={<Trash2 className="h-4 w-4" />}
                        variant="ghost"
                        size="sm"
                        aria-label="Challenge löschen"
                        title="Challenge löschen"
                        onClick={() => handleDeleteChallenge(challenge.id)}
                        className="text-status-danger"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Album Challenges */}
        {albumChallenges.length > 0 && (
          <div className="bg-app-card rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Album-Challenges</h2>
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryChallenges = albumChallenges.filter(c => c.categoryId === category.id);
                if (categoryChallenges.length === 0) return null;
                
                return (
                  <div key={category.id} className="border border-app-border rounded-lg p-4">
                    <h3 className="font-semibold text-app-fg mb-3">{category.name}</h3>
                    <div className="space-y-2">
                      {categoryChallenges.map((challenge) => (
                        <div key={challenge.id} className="bg-app-bg rounded p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-status-warning" />
                              <span className="text-sm font-medium">{challenge.title}</span>
                              {!challenge.isActive && (
                                <span className="text-xs text-app-muted">(Inaktiv)</span>
                              )}
                            </div>
                            {challenge.description && (
                              <p className="text-xs text-app-muted mt-1">{challenge.description}</p>
                            )}
                            <div className="text-xs text-app-muted mt-1">
                              {challenge.completions?.length || 0} Erfüllung(en)
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <IconButton
                              icon={<Copy className="h-4 w-4" />}
                              variant="ghost"
                              size="sm"
                              aria-label="Auf andere Alben kopieren"
                              title="Auf andere Alben kopieren"
                              onClick={() => handleCopyChallenge(challenge.id)}
                              className="text-app-fg"
                            />
                            <IconButton
                              icon={<Edit2 className="h-4 w-4" />}
                              variant="ghost"
                              size="sm"
                              aria-label="Challenge bearbeiten"
                              title="Challenge bearbeiten"
                              onClick={() => startEdit(challenge)}
                              className="text-app-fg"
                            />
                            <IconButton
                              icon={<Trash2 className="h-4 w-4" />}
                              variant="ghost"
                              size="sm"
                              aria-label="Challenge löschen"
                              title="Challenge löschen"
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              className="text-status-danger"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {challenges.length === 0 && challengesEnabled && (
          <div className="bg-app-card rounded-lg shadow p-12 text-center">
            <Trophy className="w-16 h-16 text-app-border mx-auto mb-4" />
            <p className="text-app-muted">Noch keine Challenges erstellt</p>
            <p className="text-sm text-app-muted mt-2">Erstelle deine erste Challenge!</p>
          </div>
        )}
      </div>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}

