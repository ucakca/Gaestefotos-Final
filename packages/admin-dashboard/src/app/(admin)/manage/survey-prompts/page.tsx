'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Search,
  Calendar,
  Copy,
  Wand2,
  Save,
  X,
  Info,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface SurveyQuestion {
  id: string;
  question: string;
  promptTemplate: string;
  negativePrompt: string;
  aiFeature: string;
  style: string;
  sortOrder: number;
}

interface EventListItem {
  id: string;
  name: string;
}

const DEFAULT_STYLES: Record<string, { label: string; color: string }> = {
  dreamjob: { label: 'Traumjob', color: 'text-blue-400' },
  'spirit-animal': { label: 'Seelentier', color: 'text-green-400' },
  'time-travel': { label: 'Zeitreise', color: 'text-amber-400' },
  'superhero-name': { label: 'Superheld', color: 'text-red-400' },
  superpower: { label: 'Superkraft', color: 'text-purple-400' },
};

export default function SurveyPromptsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    question: '',
    promptTemplate: '',
    negativePrompt: '',
    aiFeature: 'style_transfer',
    style: '',
    sortOrder: 0,
  });

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const r = await api.get('/events', { params: { limit: 200 } });
      const list = (r.data?.events || r.data || []).map((e: any) => ({
        id: e.id, name: e.name || e.title || e.id,
      }));
      setEvents(list);
    } catch {
      toast.error('Events konnten nicht geladen werden');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadQuestions = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const r = await api.get(`/events/${selectedEventId}/survey-prompts`);
      setQuestions(r.data?.questions || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (selectedEventId) loadQuestions(); }, [selectedEventId, loadQuestions]);

  const resetForm = () => setForm({
    question: '', promptTemplate: '', negativePrompt: '',
    aiFeature: 'style_transfer', style: '', sortOrder: questions.length,
  });

  const startEdit = (q: SurveyQuestion) => {
    setEditingId(q.id);
    setForm({
      question: q.question, promptTemplate: q.promptTemplate,
      negativePrompt: q.negativePrompt, aiFeature: q.aiFeature,
      style: q.style, sortOrder: q.sortOrder,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selectedEventId || !form.question || !form.promptTemplate) {
      toast.error('Frage und Prompt-Template sind erforderlich');
      return;
    }
    if (!form.promptTemplate.includes('{answer}')) {
      toast.error('Prompt-Template muss {answer} als Platzhalter enthalten');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/events/${selectedEventId}/survey-prompts`, {
        ...form,
        id: editingId || undefined,
      });
      toast.success(editingId ? 'Frage aktualisiert' : 'Frage erstellt');
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadQuestions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (q: SurveyQuestion) => {
    if (!confirm(`"${q.question}" löschen?`)) return;
    setDeleting(q.id);
    try {
      await api.delete(`/events/${selectedEventId}/survey-prompts/${q.id}`);
      toast.success('Frage gelöscht');
      loadQuestions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyDefaults = async () => {
    if (!selectedEventId) return;
    if (!confirm('Standard-Fragen für dieses Event kopieren? Bestehende Fragen bleiben erhalten.')) return;
    setCopying(true);
    try {
      await api.post(`/events/${selectedEventId}/survey-prompts/copy-defaults`);
      toast.success('Standard-Fragen kopiert');
      loadQuestions();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler');
    } finally {
      setCopying(false);
    }
  };

  const filteredEvents = events.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search)
  );

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-xl">
              <ClipboardList className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Survey → AI Prompts</h1>
              <p className="text-sm text-gray-400">Gast beantwortet Frage → personalisiertes AI-Bild</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <ModernCard className="p-4 border border-violet-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Survey-Input → AI-Prompt Pipeline</p>
              <p className="text-xs text-gray-400 mt-1">
                Definiere Fragen, die Gäste am Booth beantworten. Die Antwort wird in ein Prompt-Template eingesetzt
                und ein personalisiertes AI-Bild generiert. Nutze <code className="text-violet-300">{'{answer}'}</code> als
                Platzhalter im Template.
              </p>
            </div>
          </div>
        </ModernCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Selector */}
          <div className="lg:col-span-1">
            <ModernCard className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Event auswählen
              </h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Event suchen…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white"
                />
              </div>
              {loadingEvents ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Keine Events</p>
                  ) : filteredEvents.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEventId(e.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedEventId === e.id
                          ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{e.id.slice(0, 12)}…</div>
                    </button>
                  ))}
                </div>
              )}
            </ModernCard>
          </div>

          {/* Questions Panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedEventId ? (
              <ModernCard className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Wähle ein Event aus der Liste</p>
              </ModernCard>
            ) : loading ? (
              <ModernCard className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              </ModernCard>
            ) : (
              <>
                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-lg text-sm text-violet-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Neue Frage
                  </button>
                  <button
                    onClick={handleCopyDefaults}
                    disabled={copying}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                  >
                    {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    Standard-Fragen kopieren
                  </button>
                  <button
                    onClick={loadQuestions}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors ml-auto"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Add/Edit Form */}
                {showForm && (
                  <ModernCard className="p-5 space-y-4 border border-violet-500/20">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-white">
                        {editingId ? 'Frage bearbeiten' : 'Neue Survey-Frage'}
                      </h2>
                      <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>
                        <X className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Frage an den Gast *</label>
                        <input
                          value={form.question}
                          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                          placeholder="z.B. Was ist dein Traumjob?"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">
                          Prompt-Template * <span className="text-violet-400">(nutze {'{answer}'} als Platzhalter)</span>
                        </label>
                        <textarea
                          value={form.promptTemplate}
                          onChange={e => setForm(f => ({ ...f, promptTemplate: e.target.value }))}
                          rows={3}
                          placeholder="photorealistic portrait of the same person as a professional {answer}, wearing appropriate work clothes..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Negative Prompt (optional)</label>
                        <input
                          value={form.negativePrompt}
                          onChange={e => setForm(f => ({ ...f, negativePrompt: e.target.value }))}
                          placeholder="cartoon, anime, low quality, blurry"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Style-Key</label>
                          <input
                            value={form.style}
                            onChange={e => setForm(f => ({ ...f, style: e.target.value }))}
                            placeholder="z.B. dreamjob"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Reihenfolge</label>
                          <input
                            type="number"
                            value={form.sortOrder}
                            onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {editingId ? 'Speichern' : 'Erstellen'}
                      </button>
                      <button
                        onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 transition-colors"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </ModernCard>
                )}

                {/* Questions List */}
                {questions.length === 0 ? (
                  <ModernCard className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-2">Keine Survey-Fragen konfiguriert</p>
                    <p className="text-xs text-gray-500">
                      Klicke &quot;Standard-Fragen kopieren&quot; um mit 5 vordefinierten Fragen zu starten
                    </p>
                  </ModernCard>
                ) : (
                  <div className="space-y-3">
                    {questions.sort((a, b) => a.sortOrder - b.sortOrder).map((q, idx) => {
                      const styleCfg = DEFAULT_STYLES[q.style] || { label: q.style, color: 'text-gray-400' };
                      return (
                        <ModernCard key={q.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 text-sm font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="text-sm font-semibold text-white">{q.question}</h4>
                                <Badge variant="secondary">{styleCfg.label}</Badge>
                              </div>
                              <div className="bg-white/5 rounded-lg px-3 py-2 mb-2">
                                <p className="text-xs text-gray-300 font-mono break-all">
                                  {q.promptTemplate.length > 120
                                    ? q.promptTemplate.slice(0, 120) + '…'
                                    : q.promptTemplate}
                                </p>
                              </div>
                              {q.negativePrompt && (
                                <p className="text-[10px] text-gray-500">
                                  Negative: {q.negativePrompt.slice(0, 60)}{q.negativePrompt.length > 60 ? '…' : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => startEdit(q)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                title="Bearbeiten"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-white" />
                              </button>
                              <button
                                onClick={() => handleDelete(q)}
                                disabled={deleting === q.id}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                                title="Löschen"
                              >
                                {deleting === q.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-300" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-red-300" />
                                )}
                              </button>
                            </div>
                          </div>
                        </ModernCard>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
