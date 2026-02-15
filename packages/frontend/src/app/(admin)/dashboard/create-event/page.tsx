'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowRight,
  Sparkles,
  User,
  Mail,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface UserResult {
  id: string;
  name: string;
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

export default function AdminCreateEventPage() {
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
  const [createdEvent, setCreatedEvent] = useState<{ id: string; title: string; slug: string; host: { name: string; email: string } } | null>(null);

  // Load packages
  useEffect(() => {
    api.get('/admin/events/0/available-packages')
      .then(res => setPackages(res.data?.packages || []))
      .catch(() => {});
  }, []);

  // Debounced user search
  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setUsers([]); return; }
    setSearchLoading(true);
    try {
      const { data } = await api.get(`/admin/users?q=${encodeURIComponent(q)}&limit=10`);
      setUsers(data.users || []);
    } catch { setUsers([]); }
    finally { setSearchLoading(false); }
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
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
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
      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-card border border-border shadow-lg p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Event erstellt!</h2>
          <p className="text-muted-foreground text-sm mb-4">
            <strong>{createdEvent.title}</strong> wurde für{' '}
            <strong>{createdEvent.host.name || createdEvent.host.email}</strong> erstellt.
          </p>
          <p className="text-xs text-muted-foreground mb-6 font-mono bg-background rounded-lg px-3 py-2">
            Slug: {createdEvent.slug}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/events/${createdEvent.id}/dashboard`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Zum Event <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Weiteres Event erstellen
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-500" />
          Event für Benutzer erstellen
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Erstelle ein Event im Namen eines Hosts. Der Host sieht es in seinem Dashboard und kann es weiter konfigurieren.
        </p>
      </div>

      {/* Step 1: User Selection */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</span>
          Benutzer auswählen
        </h2>

        {selectedUser ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              {(selectedUser.name || selectedUser.email)[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground">{selectedUser.name}</div>
              <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {selectedUser.role}
            </span>
            <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-blue-100 text-blue-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Name oder E-Mail des Hosts suchen..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
            </div>
            <AnimatePresence>
              {users.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-60 overflow-y-auto"
                >
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setUserSearch(''); setUsers([]); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground text-xs font-bold flex-shrink-0">
                        {(u.name || u.email)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                        {u.role}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {userSearch.length >= 2 && !searchLoading && users.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Keine Benutzer gefunden</p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Event Details */}
      <div className={`rounded-2xl border border-border bg-card shadow-sm p-5 mb-4 transition-opacity ${selectedUser ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</span>
          Event-Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Event-Titel <span className="text-destructive/80">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Hochzeit Anna & Max"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Datum
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Ort
              </label>
              <input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Passwort
              </label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1">
                <Package className="w-3.5 h-3.5 text-muted-foreground" /> Paket
              </label>
              <select
                value={packageSku}
                onChange={e => setPackageSku(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Free (Standard)</option>
                {packages.map(p => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} ({p.resultingTier}) — €{(p.priceEurCents / 100).toFixed(0)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Admin-Notizen</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Interne Notizen (sichtbar als Profil-Beschreibung)"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={!selectedUser || !title.trim() || saving}
        className="w-full py-3 rounded-2xl bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Event erstellen für {selectedUser?.name || 'Benutzer'}
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Der Host sieht das Event sofort in seinem Dashboard und kann es mit dem Wizard weiter konfigurieren.
      </p>
    </div>
  );
}
