'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Key,
  Activity,
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
  BarChart3,
  Plug,
  Star,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AiProvider {
  id: string;
  slug: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyHint: string | null;
  hasApiKey: boolean;
  defaultModel: string | null;
  models: { id: string; name: string; costPer1kTokens?: number }[] | null;
  isActive: boolean;
  isDefault: boolean;
  rateLimitPerMinute: number | null;
  rateLimitPerDay: number | null;
  monthlyBudgetCents: number | null;
  config: any;
  createdAt: string;
  updatedAt: string;
  _count: { usageLogs: number; featureMappings: number };
}

interface AiFeatureMapping {
  id: string;
  feature: string;
  providerId: string;
  model: string | null;
  isEnabled: boolean;
  maxTokens: number | null;
  temperature: number | null;
  provider: { id: string; slug: string; name: string; type: string };
}

interface UsageStats {
  monthly: { requests: number; tokens: number; costCents: number };
  errorRate: string;
  perProvider: any[];
  perFeature: any[];
  daily: { day: string; requests: number; tokens: number; cost: number }[];
}

const PROVIDER_TYPES = [
  { value: 'LLM', label: 'LLM (Text)', color: 'bg-blue-500' },
  { value: 'IMAGE_GEN', label: 'Bildgenerierung', color: 'bg-purple-500' },
  { value: 'FACE_RECOGNITION', label: 'Gesichtserkennung', color: 'bg-green-500' },
  { value: 'VIDEO_GEN', label: 'Videogenerierung', color: 'bg-orange-500' },
  { value: 'STT', label: 'Speech-to-Text', color: 'bg-cyan-500' },
  { value: 'TTS', label: 'Text-to-Speech', color: 'bg-pink-500' },
];

const AI_FEATURES = [
  { key: 'chat', label: 'KI Chat-Assistent', type: 'LLM' },
  { key: 'album_suggest', label: 'Album-Vorschläge', type: 'LLM' },
  { key: 'description_suggest', label: 'Beschreibungs-Generator', type: 'LLM' },
  { key: 'invitation_suggest', label: 'Einladungstext-Generator', type: 'LLM' },
  { key: 'challenge_suggest', label: 'Challenge-Vorschläge', type: 'LLM' },
  { key: 'guestbook_suggest', label: 'Gästebuch-Nachricht', type: 'LLM' },
  { key: 'color_scheme', label: 'Farbschema-Generator', type: 'LLM' },
  { key: 'face_search', label: 'Gesichtssuche (Face Search)', type: 'FACE_RECOGNITION' },
  { key: 'style_transfer', label: 'KI Booth — Style Transfer', type: 'IMAGE_GEN' },
  { key: 'drawbot', label: 'Drawbot — Porträtzeichnung', type: 'IMAGE_GEN' },
  { key: 'highlight_reel', label: 'Highlight Reel', type: 'VIDEO_GEN' },
  { key: 'compliment_mirror', label: 'Compliment Mirror', type: 'LLM' },
  { key: 'face_switch', label: 'Face Switch', type: 'IMAGE_GEN' },
];

function getTypeInfo(type: string) {
  return PROVIDER_TYPES.find(t => t.value === type) || { value: type, label: type, color: 'bg-gray-500' };
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white
      ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80"><X className="w-3 h-3" /></button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function AiProvidersPage() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [mappings, setMappings] = useState<AiFeatureMapping[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'features' | 'usage'>('providers');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editProvider, setEditProvider] = useState<Partial<AiProvider> & { apiKey?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; durationMs: number } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [provRes, mapRes, statsRes] = await Promise.all([
        api.get('/admin/ai-providers'),
        api.get('/admin/ai-providers/features/mappings'),
        api.get('/admin/ai-providers/usage/stats?days=30'),
      ]);
      setProviders(provRes.data.providers || []);
      setMappings(mapRes.data.mappings || []);
      setStats(statsRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Laden', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Save Provider ───
  const handleSaveProvider = async () => {
    if (!editProvider) return;
    setSaving(true);
    try {
      const payload: any = {
        slug: editProvider.slug,
        name: editProvider.name,
        type: editProvider.type,
        baseUrl: editProvider.baseUrl || null,
        defaultModel: editProvider.defaultModel || null,
        isActive: editProvider.isActive ?? true,
        isDefault: editProvider.isDefault ?? false,
        rateLimitPerMinute: editProvider.rateLimitPerMinute || null,
        rateLimitPerDay: editProvider.rateLimitPerDay || null,
        monthlyBudgetCents: editProvider.monthlyBudgetCents || null,
      };
      if (editProvider.apiKey !== undefined) {
        payload.apiKey = editProvider.apiKey || null;
      }

      if (editProvider.id) {
        await api.put(`/admin/ai-providers/${editProvider.id}`, payload);
        showToast('Provider gespeichert', 'success');
      } else {
        await api.post('/admin/ai-providers', payload);
        showToast('Provider erstellt', 'success');
      }
      setEditProvider(null);
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Provider ───
  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Provider wirklich löschen? Alle Usage-Logs werden ebenfalls gelöscht.')) return;
    try {
      await api.delete(`/admin/ai-providers/${id}`);
      showToast('Provider gelöscht', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Löschen', 'error');
    }
  };

  // ─── Test Provider ───
  const handleTestProvider = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const res = await api.post(`/admin/ai-providers/${id}/test`);
      setTestResult({ id, ...res.data });
    } catch (err: any) {
      setTestResult({ id, success: false, message: err.response?.data?.error || 'Test fehlgeschlagen', durationMs: 0 });
    } finally {
      setTesting(null);
    }
  };

  // ─── Update Feature Mapping ───
  const handleUpdateMapping = async (feature: string, providerId: string, isEnabled: boolean) => {
    try {
      await api.put(`/admin/ai-providers/features/mappings/${feature}`, { providerId, isEnabled });
      showToast(`Feature "${feature}" aktualisiert`, 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-app-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-app-primary" />
          <div>
            <h1 className="text-2xl font-bold text-app-foreground">AI Provider Management</h1>
            <p className="text-sm text-app-muted">API Keys, Token-Tracking, Kosten & Feature-Zuordnung</p>
          </div>
        </div>
        <button
          onClick={() => setEditProvider({
            slug: '', name: '', type: 'LLM', isActive: true, isDefault: false,
            baseUrl: null, defaultModel: null, apiKey: '',
            rateLimitPerMinute: null, rateLimitPerDay: null, monthlyBudgetCents: null,
          })}
          className="flex items-center gap-2 px-4 py-2 bg-app-primary text-white rounded-lg hover:bg-app-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Neuer Provider
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Plug className="w-4 h-4" /> Provider
            </div>
            <div className="text-2xl font-bold text-app-foreground">{providers.length}</div>
            <div className="text-xs text-app-muted">{providers.filter(p => p.isActive).length} aktiv</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Zap className="w-4 h-4" /> Requests (Monat)
            </div>
            <div className="text-2xl font-bold text-app-foreground">{stats.monthly.requests.toLocaleString()}</div>
            <div className="text-xs text-app-muted">{stats.monthly.tokens.toLocaleString()} Tokens</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <BarChart3 className="w-4 h-4" /> Kosten (Monat)
            </div>
            <div className="text-2xl font-bold text-app-foreground">{formatCents(stats.monthly.costCents)}</div>
            <div className="text-xs text-app-muted">geschätzt</div>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Shield className="w-4 h-4" /> Fehlerrate
            </div>
            <div className="text-2xl font-bold text-app-foreground">{stats.errorRate}%</div>
            <div className="text-xs text-app-muted">letzte 30 Tage</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-app-border">
        {([
          { key: 'providers', label: 'Provider', icon: Plug },
          { key: 'features', label: 'Feature-Zuordnung', icon: Zap },
          { key: 'usage', label: 'Nutzung & Kosten', icon: BarChart3 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition
              ${activeTab === tab.key
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-foreground'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ Tab: Provider List ═══════════ */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          {providers.length === 0 ? (
            <div className="text-center py-16 text-app-muted">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Noch keine AI Provider konfiguriert</p>
              <p className="text-sm mt-1">Erstelle deinen ersten Provider um KI-Features zu nutzen.</p>
            </div>
          ) : (
            providers.map(provider => {
              const typeInfo = getTypeInfo(provider.type);
              return (
                <div key={provider.id} className="bg-app-card border border-app-border rounded-lg p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-app-foreground">{provider.name}</h3>
                          {provider.isDefault && (
                            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3" /> Default
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            provider.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {provider.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-app-muted">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${typeInfo.color} text-white`}>
                            {typeInfo.label}
                          </span>
                          <span className="font-mono text-xs">{provider.slug}</span>
                          {provider.defaultModel && (
                            <span className="text-xs">Modell: <strong>{provider.defaultModel}</strong></span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-app-muted">
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            {provider.hasApiKey ? (
                              <span className="text-green-600">API Key: {provider.apiKeyHint}</span>
                            ) : (
                              <span className="text-red-500">Kein API Key</span>
                            )}
                          </span>
                          {provider.rateLimitPerMinute && (
                            <span>{provider.rateLimitPerMinute} Req/Min</span>
                          )}
                          {provider.rateLimitPerDay && (
                            <span>{provider.rateLimitPerDay} Req/Tag</span>
                          )}
                          {provider.monthlyBudgetCents && (
                            <span>Budget: {formatCents(provider.monthlyBudgetCents)}/Mo</span>
                          )}
                          <span>{provider._count.usageLogs} Logs</span>
                          <span>{provider._count.featureMappings} Features</span>
                        </div>
                        {/* Test result */}
                        {testResult && testResult.id === provider.id && (
                          <div className={`mt-2 text-xs px-3 py-2 rounded ${
                            testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {testResult.success ? '✓' : '✗'} {testResult.message} ({testResult.durationMs}ms)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestProvider(provider.id)}
                        disabled={testing === provider.id || !provider.hasApiKey}
                        className="p-2 text-app-muted hover:text-blue-600 transition disabled:opacity-30"
                        title="Verbindung testen"
                      >
                        {testing === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditProvider({ ...provider, apiKey: undefined })}
                        className="p-2 text-app-muted hover:text-app-primary transition"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="p-2 text-app-muted hover:text-red-600 transition"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══════════ Tab: Feature Mappings ═══════════ */}
      {activeTab === 'features' && (
        <div className="bg-app-card border border-app-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border bg-app-muted/5">
                <th className="text-left px-4 py-3 font-medium text-app-muted">Feature</th>
                <th className="text-left px-4 py-3 font-medium text-app-muted">Typ</th>
                <th className="text-left px-4 py-3 font-medium text-app-muted">Provider</th>
                <th className="text-center px-4 py-3 font-medium text-app-muted">Aktiviert</th>
              </tr>
            </thead>
            <tbody>
              {AI_FEATURES.map(feat => {
                const mapping = mappings.find(m => m.feature === feat.key);
                const compatible = providers.filter(p => p.type === feat.type && p.isActive);
                const typeInfo = getTypeInfo(feat.type);

                return (
                  <tr key={feat.key} className="border-b border-app-border last:border-0 hover:bg-app-muted/5">
                    <td className="px-4 py-3">
                      <span className="font-medium text-app-foreground">{feat.label}</span>
                      <div className="text-xs text-app-muted font-mono">{feat.key}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded ${typeInfo.color} text-white`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {compatible.length > 0 ? (
                        <select
                          value={mapping?.providerId || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleUpdateMapping(feat.key, e.target.value, mapping?.isEnabled ?? true);
                            }
                          }}
                          className="text-sm bg-transparent border border-app-border rounded px-2 py-1 text-app-foreground"
                        >
                          <option value="">— nicht zugeordnet —</option>
                          {compatible.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-app-muted italic">Kein kompatibler Provider</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {mapping ? (
                        <button
                          onClick={() => handleUpdateMapping(feat.key, mapping.providerId, !mapping.isEnabled)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            mapping.isEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            mapping.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                      ) : (
                        <span className="text-xs text-app-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════ Tab: Usage & Costs ═══════════ */}
      {activeTab === 'usage' && stats && (
        <div className="space-y-6">
          {/* Per Provider */}
          <div>
            <h3 className="text-lg font-semibold text-app-foreground mb-3">Nutzung pro Provider (30 Tage)</h3>
            <div className="bg-app-card border border-app-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app-border bg-app-muted/5">
                    <th className="text-left px-4 py-3 font-medium text-app-muted">Provider</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Requests</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Input Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Output Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Total Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Kosten</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Ø Latenz</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perProvider.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-app-muted">Keine Daten</td></tr>
                  ) : (
                    stats.perProvider.map((row: any) => {
                      const prov = providers.find(p => p.id === row.providerId);
                      return (
                        <tr key={row.providerId} className="border-b border-app-border last:border-0">
                          <td className="px-4 py-3 font-medium text-app-foreground">{prov?.name || row.providerId}</td>
                          <td className="px-4 py-3 text-right">{row._count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{(row._sum.inputTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{(row._sum.outputTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-medium">{(row._sum.totalTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{formatCents(row._sum.costCents || 0)}</td>
                          <td className="px-4 py-3 text-right">{Math.round(row._avg.durationMs || 0)}ms</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per Feature */}
          <div>
            <h3 className="text-lg font-semibold text-app-foreground mb-3">Nutzung pro Feature (30 Tage)</h3>
            <div className="bg-app-card border border-app-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app-border bg-app-muted/5">
                    <th className="text-left px-4 py-3 font-medium text-app-muted">Feature</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Requests</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Kosten</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted">Ø Latenz</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perFeature.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-app-muted">Keine Daten</td></tr>
                  ) : (
                    stats.perFeature.map((row: any) => {
                      const feat = AI_FEATURES.find(f => f.key === row.feature);
                      return (
                        <tr key={row.feature} className="border-b border-app-border last:border-0">
                          <td className="px-4 py-3">
                            <span className="font-medium text-app-foreground">{feat?.label || row.feature}</span>
                            <span className="text-xs text-app-muted ml-2 font-mono">{row.feature}</span>
                          </td>
                          <td className="px-4 py-3 text-right">{row._count.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{(row._sum.totalTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{formatCents(row._sum.costCents || 0)}</td>
                          <td className="px-4 py-3 text-right">{Math.round(row._avg.durationMs || 0)}ms</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Chart (simple text-based) */}
          {stats.daily.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-app-foreground mb-3">Tagesverlauf (30 Tage)</h3>
              <div className="bg-app-card border border-app-border rounded-lg p-4">
                <div className="flex items-end gap-1 h-32">
                  {stats.daily.map((d, i) => {
                    const maxReq = Math.max(...stats.daily.map(x => x.requests), 1);
                    const height = (d.requests / maxReq) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-app-primary/70 hover:bg-app-primary rounded-t transition-colors"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${new Date(d.day).toLocaleDateString('de-DE')}: ${d.requests} Requests, ${d.tokens} Tokens, ${formatCents(d.cost)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-app-muted mt-2">
                  <span>{stats.daily.length > 0 ? new Date(stats.daily[0].day).toLocaleDateString('de-DE') : ''}</span>
                  <span>{stats.daily.length > 0 ? new Date(stats.daily[stats.daily.length - 1].day).toLocaleDateString('de-DE') : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Edit/Create Modal ═══════════ */}
      {editProvider && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setEditProvider(null)}>
          <div className="bg-app-card rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h2 className="text-lg font-semibold text-app-foreground">
                {editProvider.id ? 'Provider bearbeiten' : 'Neuer Provider'}
              </h2>
              <button onClick={() => setEditProvider(null)} className="text-app-muted hover:text-app-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Name + Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Name</label>
                  <input
                    value={editProvider.name || ''}
                    onChange={e => setEditProvider({ ...editProvider, name: e.target.value })}
                    placeholder="z.B. Groq (Llama 3.1)"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Slug</label>
                  <input
                    value={editProvider.slug || ''}
                    onChange={e => setEditProvider({ ...editProvider, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="z.B. groq"
                    disabled={!!editProvider.id}
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Provider-Typ</label>
                <select
                  value={editProvider.type || 'LLM'}
                  onChange={e => setEditProvider({ ...editProvider, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                >
                  {PROVIDER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                  API Key {editProvider.hasApiKey && editProvider.apiKey === undefined && (
                    <span className="text-green-600">(gesetzt: {editProvider.apiKeyHint})</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={editProvider.apiKey ?? ''}
                    onChange={e => setEditProvider({ ...editProvider, apiKey: e.target.value })}
                    placeholder={editProvider.hasApiKey ? '••• Nicht geändert — nur bei Neueingabe ausfüllen' : 'sk-...'}
                    className="w-full px-3 py-2 pr-10 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-foreground"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL + Default Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Base URL (optional)</label>
                  <input
                    value={editProvider.baseUrl || ''}
                    onChange={e => setEditProvider({ ...editProvider, baseUrl: e.target.value || null })}
                    placeholder="https://api.groq.com/openai/v1"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Default Model</label>
                  <input
                    value={editProvider.defaultModel || ''}
                    onChange={e => setEditProvider({ ...editProvider, defaultModel: e.target.value || null })}
                    placeholder="llama-3.1-70b-versatile"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                  />
                </div>
              </div>

              {/* Rate Limits */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Req/Min</label>
                  <input
                    type="number"
                    value={editProvider.rateLimitPerMinute ?? ''}
                    onChange={e => setEditProvider({ ...editProvider, rateLimitPerMinute: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="∞"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Req/Tag</label>
                  <input
                    type="number"
                    value={editProvider.rateLimitPerDay ?? ''}
                    onChange={e => setEditProvider({ ...editProvider, rateLimitPerDay: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="∞"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Budget/Mo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editProvider.monthlyBudgetCents ? (editProvider.monthlyBudgetCents / 100).toFixed(2) : ''}
                    onChange={e => setEditProvider({ ...editProvider, monthlyBudgetCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                    placeholder="∞"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-app-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProvider.isActive ?? true}
                    onChange={e => setEditProvider({ ...editProvider, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Aktiv
                </label>
                <label className="flex items-center gap-2 text-sm text-app-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProvider.isDefault ?? false}
                    onChange={e => setEditProvider({ ...editProvider, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  Default für Typ
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-app-border">
              <button
                onClick={() => setEditProvider(null)}
                className="px-4 py-2 text-sm text-app-muted hover:text-app-foreground transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveProvider}
                disabled={saving || !editProvider.name || !editProvider.slug}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-app-primary text-white rounded-lg hover:bg-app-primary/90 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editProvider.id ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
