'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Save, Loader2, RefreshCw, CheckCircle, XCircle, Send, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

const EMPTY: SmtpConfig = { host: '', port: 587, secure: false, user: '', password: '', from: '' };

const PRESETS: { label: string; host: string; port: number; secure: boolean }[] = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
  { label: 'Gmail (SSL)', host: 'smtp.gmail.com', port: 465, secure: true },
  { label: 'Outlook / Hotmail', host: 'smtp-mail.outlook.com', port: 587, secure: false },
  { label: 'Strato', host: 'smtp.strato.de', port: 465, secure: true },
  { label: 'IONOS / 1&1', host: 'smtp.ionos.de', port: 587, secure: false },
  { label: 'Hetzner Mail', host: 'mail.your-server.de', port: 587, secure: false },
  { label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, secure: false },
  { label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false },
];

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<SmtpConfig>(EMPTY);
  const [original, setOriginal] = useState<SmtpConfig>(EMPTY);
  const [showPw, setShowPw] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ configured: boolean; connected?: boolean; config: SmtpConfig | null }>(
        '/admin/settings/email'
      );
      setConfigured(res.data.configured);
      setConnected(res.data.connected ?? false);
      if (res.data.config) {
        setConfig(res.data.config);
        setOriginal(res.data.config);
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setConfig(c => ({ ...c, host: preset.host, port: preset.port, secure: preset.secure }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; connected: boolean }>('/admin/settings/email', config);
      setConnected(res.data.connected);
      setConfigured(true);
      setOriginal(config);
      if (res.data.connected) {
        toast.success('✅ SMTP gespeichert & Verbindung erfolgreich!');
      } else {
        toast.error('Einstellungen gespeichert, aber Verbindungstest fehlgeschlagen. Bitte Credentials prüfen.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) { toast.error('Bitte eine Test-E-Mail-Adresse eingeben'); return; }
    setTesting(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/admin/settings/email/test', { to: testEmail });
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Test fehlgeschlagen');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
      </div>
    );
  }

  return (
    <PageTransition className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-app-fg">E-Mail Einstellungen</h1>
            <p className="text-sm text-app-muted">SMTP-Server für Einladungen, Benachrichtigungen & Recap-E-Mails</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button size="sm" variant="outline" onClick={() => setConfig(original)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Verwerfen
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${
        configured && connected
          ? 'border-green-500/30 bg-green-500/5 text-green-400'
          : configured
          ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400'
          : 'border-red-500/30 bg-red-500/5 text-red-400'
      }`}>
        {configured && connected ? (
          <CheckCircle className="w-5 h-5 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 shrink-0" />
        )}
        <span className="text-sm font-medium">
          {configured && connected
            ? 'SMTP verbunden — E-Mails werden gesendet'
            : configured
            ? 'SMTP konfiguriert, aber Verbindung fehlgeschlagen — Credentials prüfen'
            : 'Kein SMTP konfiguriert — E-Mails werden nicht gesendet'}
        </span>
      </div>

      {/* Provider Presets */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-app-fg">Schnellauswahl Provider</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-xs rounded-lg border border-app-border bg-app-bg hover:border-blue-500/50 hover:text-blue-400 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* SMTP Form */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-app-fg">SMTP Konfiguration</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-2 block">SMTP Host</label>
            <Input
              value={config.host}
              onChange={e => setConfig(c => ({ ...c, host: e.target.value }))}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Port</label>
            <Input
              type="number"
              value={config.port}
              onChange={e => setConfig(c => ({ ...c, port: Number(e.target.value) }))}
              placeholder="587"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.secure}
              onChange={e => setConfig(c => ({ ...c, secure: e.target.checked }))}
            />
            <div className="w-10 h-6 bg-app-border peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
          <span className="text-sm text-app-muted">SSL/TLS (Port 465) — STARTTLS nutzt Port 587 ohne SSL</span>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">SMTP Benutzername (E-Mail)</label>
          <Input
            type="email"
            value={config.user}
            onChange={e => setConfig(c => ({ ...c, user: e.target.value }))}
            placeholder="noreply@gaestefotos.com"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Passwort / App-Passwort</label>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              value={config.password}
              onChange={e => setConfig(c => ({ ...c, password: e.target.value }))}
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-fg"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-app-muted mt-1">
            Bei Gmail: App-Passwort unter Konto → Sicherheit → 2-Faktor → App-Passwörter erstellen
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Absender-Adresse (optional)</label>
          <Input
            value={config.from}
            onChange={e => setConfig(c => ({ ...c, from: e.target.value }))}
            placeholder="Gästefotos <noreply@gaestefotos.com>"
          />
          <p className="text-xs text-app-muted mt-1">Leer lassen = SMTP-Benutzername wird als Absender verwendet</p>
        </div>
      </div>

      {/* Test E-Mail */}
      {configured && (
        <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-app-fg">Test-E-Mail senden</h2>
          <div className="flex gap-3">
            <Input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={testing || !connected} variant="outline">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="ml-2">Senden</span>
            </Button>
          </div>
          {!connected && (
            <p className="text-xs text-yellow-400">Speichere zuerst gültige SMTP-Credentials um die Verbindung herzustellen.</p>
          )}
        </div>
      )}

      {/* Help */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-400">💡 Konfigurationshinweise</p>
        <ul className="text-xs text-blue-300 space-y-1 list-disc list-inside">
          <li>Gmail: 2-Faktor aktivieren → App-Passwort erstellen (normales Passwort funktioniert NICHT)</li>
          <li>Strato/IONOS: SMTP-Benutzername = vollständige E-Mail-Adresse</li>
          <li>Nach dem Speichern startet die Verbindung sofort ohne Server-Neustart</li>
          <li>Passwort wird verschlüsselt in der Datenbank gespeichert (AES-256-GCM)</li>
        </ul>
      </div>
    </PageTransition>
  );
}
