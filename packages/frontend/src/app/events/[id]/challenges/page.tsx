'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { Plus, Trash2, Edit2, X, Trophy, Copy, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';

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
      console.error('Fehler beim Laden des Events:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`);
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Fehler beim Laden der Alben:', err);
    }
  };

  const loadChallenges = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/challenges`);
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error('Fehler beim Laden der Challenges:', err);
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
      console.error('Fehler beim Hinzufügen:', err);
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
      console.error('Fehler beim Aktualisieren:', err);
      const errorMessage = err.response?.data?.error || 'Fehler beim Aktualisieren';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Challenge wirklich löschen?')) return;
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  const featuresConfig = (event?.featuresConfig as any) || {};
  const challengesEnabled = featuresConfig.challengesEnabled === true;

  // Separate challenges by type
  const globalChallenges = challenges.filter(c => !c.categoryId);
  const albumChallenges = challenges.filter(c => c.categoryId);

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Challenges
              </h1>
              <p className="text-gray-600">
                {event?.title} • {challenges.length} Challenge{challenges.length !== 1 ? 's' : ''}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowAddForm(!showAddForm);
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
              disabled={!challengesEnabled}
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                challengesEnabled
                  ? 'bg-[#295B4D] text-white hover:bg-[#1f4238]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              Challenge hinzufügen
            </motion.button>
          </div>
        </motion.div>

        {!challengesEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Trophy className="w-5 h-5" />
              <p className="font-medium">Challenges sind deaktiviert</p>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
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
              className="bg-white rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4">
                {editingChallenge ? 'Challenge bearbeiten' : 'Neue Challenge'}
              </h2>
              <form onSubmit={editingChallenge ? handleUpdateChallenge : handleAddChallenge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    placeholder="z.B. Bestes Paar-Foto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    rows={2}
                    placeholder="Optionale Beschreibung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Album zuweisen (leer = globale Challenge)
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    <option value="">Globale Challenge</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Aktiv</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isVisible}
                        onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Foto sichtbar</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowAddForm(false);
                      cancelEdit();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-[#295B4D] text-white rounded-md hover:bg-[#1f4238] shadow-sm"
                  >
                    {editingChallenge ? 'Speichern' : 'Hinzufügen'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Challenges */}
        {globalChallenges.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Globale Challenges
              </h2>
            </div>
            <div className="space-y-3">
              {globalChallenges.map((challenge) => (
                <div key={challenge.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-semibold">{challenge.title}</span>
                        {!challenge.isActive && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Inaktiv</span>
                        )}
                      </div>
                      {challenge.description && (
                        <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        {challenge.completions?.length || 0} Erfüllung(en)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(challenge)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteChallenge(challenge.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Album Challenges */}
        {albumChallenges.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Album-Challenges</h2>
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryChallenges = albumChallenges.filter(c => c.categoryId === category.id);
                if (categoryChallenges.length === 0) return null;
                
                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{category.name}</h3>
                    <div className="space-y-2">
                      {categoryChallenges.map((challenge) => (
                        <div key={challenge.id} className="bg-gray-50 rounded p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm font-medium">{challenge.title}</span>
                              {!challenge.isActive && (
                                <span className="text-xs text-gray-500">(Inaktiv)</span>
                              )}
                            </div>
                            {challenge.description && (
                              <p className="text-xs text-gray-600 mt-1">{challenge.description}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {challenge.completions?.length || 0} Erfüllung(en)
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCopyChallenge(challenge.id)}
                              className="p-1 text-blue-600 hover:text-blue-900"
                              title="Auf andere Alben kopieren"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEdit(challenge)}
                              className="p-1 text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteChallenge(challenge.id)}
                              className="p-1 text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Noch keine Challenges erstellt</p>
            <p className="text-sm text-gray-400 mt-2">Erstelle deine erste Challenge!</p>
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

