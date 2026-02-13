'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserPlus,
  Search,
  Calendar,
  MapPin,
  Lock,
  Package,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface UserResult {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface PackageOption {
  sku: string;
  name: string;
  resultingTier: string;
  priceEurCents: number;
}

export default function CreateEventPage() {
  // Step 1: User selection
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Step 2: Event details
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [password, setPassword] = useState('');
  const [packageSku, setPackageSku] = useState('');
  const [notes, setNotes] = useState('');

  // State
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEvent, setCreatedEvent] = useState<{
    id: string;
    title: string;
    slug: string;
    host: { name: string | null; email: string };
  } | null>(null);

  // Load available packages on mount
  useEffect(() => {
    // Use a dummy event ID — the endpoint only reads packages, not the event
    api.get('/admin/events/00000000-0000-0000-0000-000000000000/available-packages')
      .then(res => setPackages(res.data?.packages || []))
      .catch(() => {});
  }, []);

  // Debounced user search
  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setUsers([]); return; }
    setSearchLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, limit: 10 } });
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!userSearch.trim()) { setUsers([]); return; }
    searchTimeout.current = setTimeout(() => searchUsers(userSearch), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [userSearch, searchUsers]);

  const handleCreate = async () => {
    if (!selectedUser || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/admin/events', {
        hostId: selectedUser.id,
        title: title.trim(),
        dateTime: dateTime || null,
        locationName: locationName || null,
        password: password || null,
        packageSku: packageSku || undefined,
        notes: notes || null,
      });
      setCreatedEvent(data.event);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.details?.fieldErrors?.hostId?.[0] || 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserSearch('');
    setTitle('');
    setDateTime('');
    setLocationName('');
    setPassword('');
    setPackageSku('');
    setNotes('');
    setCreatedEvent(null);
    setError(null);
  };

  // Success state
  if (createdEvent) {
    return (
      <div className="mx-auto w-full max-w-lg py-12">
        <div className="rounded-2xl border border-app-border bg-app-card shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-app-fg mb-2">Event erstellt!</h2>
          <p className="text-app-muted text-sm mb-2">
            <strong>{createdEvent.title}</strong> wurde für{' '}
            <strong>{createdEvent.host.name || createdEvent.host.email}</strong> erstellt.
          </p>
          <p className="text-xs text-app-muted mb-6 font-mono bg-app-bg rounded-lg px-3 py-2 inline-block">
            /{createdEvent.slug}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/manage/events/${createdEvent.id}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-app-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Event verwalten <ExternalLink className="w-4 h-4" />
            </Link>
            <a
              href={`https://app.xn--gstefotos-v2a.com/events/${createdEvent.id}/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-app-border bg-app-card text-app-fg text-sm font-medium hover:bg-app-bg transition-colors"
            >
              Host-Dashboard <ExternalLink className="w-4 h-4" />
            </a>
            <Button onClick={resetForm} variant="outline" size="sm">
              <UserPlus className="w-4 h-4 mr-1.5" /> Weiteres erstellen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/manage/events"
          className="inline-flex items-center gap-1 text-sm text-app-muted hover:text-app-fg transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zu Events
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-app-accent" />
          Event für Benutzer erstellen
        </h1>
        <p className="mt-1 text-sm text-app-muted">
          Erstelle ein Event im Namen eines Hosts. Der Host sieht es sofort in seinem Dashboard.
        </p>
      </div>

      {/* Step 1: User Selection */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm p-5">
        <h2 className="font-semibold text-app-fg mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-app-accent text-white text-xs flex items-center justify-center font-bold">1</span>
          Benutzer auswählen
        </h2>

        {selectedUser ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-app-accent/5 border border-app-accent/20">
            <div className="w-10 h-10 rounded-full bg-app-accent/10 flex items-center justify-center text-app-accent font-bold text-sm">
              {(selectedUser.name || selectedUser.email)[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-app-fg">{selectedUser.name || '(kein Name)'}</div>
              <div className="text-xs text-app-muted">{selectedUser.email}</div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-app-accent/10 text-app-accent">
              {selectedUser.role}
            </span>
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1.5 rounded-lg hover:bg-app-bg text-app-muted hover:text-app-fg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <Input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Name oder E-Mail des Hosts suchen..."
                className="pl-10"
                autoFocus
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted animate-spin" />
              )}
            </div>
            {users.length > 0 && (
              <div className="rounded-xl border border-app-border bg-app-card shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setUserSearch(''); setUsers([]); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-app-bg transition-colors text-left border-b border-app-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-app-accent/10 flex items-center justify-center text-app-accent text-xs font-bold flex-shrink-0">
                      {(u.name || u.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-app-fg truncate">{u.name || '(kein Name)'}</div>
                      <div className="text-xs text-app-muted truncate">{u.email}</div>
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-app-bg text-app-muted">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {userSearch.length >= 2 && !searchLoading && users.length === 0 && (
              <p className="text-xs text-app-muted text-center py-2">Keine Benutzer gefunden</p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Event Details */}
      <div className={`rounded-2xl border border-app-border bg-app-card shadow-sm p-5 transition-opacity ${selectedUser ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <h2 className="font-semibold text-app-fg mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-app-accent text-white text-xs flex items-center justify-center font-bold">2</span>
          Event-Details
        </h2>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-app-fg mb-1.5">
              Event-Titel <span className="text-red-400">*</span>
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Hochzeit Anna & Max"
            />
          </div>

          {/* Date + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-app-fg mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-app-muted" /> Datum & Uhrzeit
              </label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-app-fg mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-app-muted" /> Veranstaltungsort
              </label>
              <Input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Password + Package */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-app-fg mb-1.5">
                <Lock className="w-3.5 h-3.5 text-app-muted" /> Event-Passwort
              </label>
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-app-fg mb-1.5">
                <Package className="w-3.5 h-3.5 text-app-muted" /> Paket zuweisen
              </label>
              <select
                value={packageSku}
                onChange={e => setPackageSku(e.target.value)}
                className="w-full h-10 rounded-lg border border-app-border bg-app-card px-4 text-sm text-app-fg transition-colors focus:border-app-fg focus:outline-none focus:ring-1 focus:ring-app-fg/30"
              >
                <option value="">Free (Standard)</option>
                {packages.map(p => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} ({p.resultingTier}) {p.priceEurCents > 0 ? `— €${(p.priceEurCents / 100).toFixed(0)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-app-fg mb-1.5">
              Admin-Notizen
            </label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Interne Notizen (werden als Profil-Beschreibung gespeichert)"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleCreate}
        disabled={!selectedUser || !title.trim() || saving}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Sparkles className="w-5 h-5 mr-2" />
        )}
        {saving ? 'Wird erstellt...' : `Event erstellen für ${selectedUser?.name || selectedUser?.email || 'Benutzer'}`}
      </Button>

      <p className="text-xs text-app-muted text-center">
        Der Host sieht das Event sofort in seinem Dashboard und kann es mit dem Wizard weiter konfigurieren.
      </p>
    </div>
  );
}
