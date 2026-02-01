'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wrench, Power, Save, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import toast from 'react-hot-toast';

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

export default function MaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MaintenanceSettings>({
    enabled: false,
    message: 'Wir führen gerade Wartungsarbeiten durch. Bitte versuche es später erneut.',
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ settings: MaintenanceSettings }>('/admin/settings/maintenance');
      setSettings(res.data.settings);
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = async () => {
    setSaving(true);
    try {
      const newState = !settings.enabled;
      await api.post('/admin/settings/maintenance', {
        ...settings,
        enabled: newState,
      });
      setSettings({ ...settings, enabled: newState });
      toast.success(newState ? 'Maintenance Mode aktiviert' : 'Maintenance Mode deaktiviert');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessage = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings/maintenance', settings);
      toast.success('Nachricht gespeichert');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler');
    } finally {
      setSaving(false);
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
          <Wrench className="w-6 h-6 text-app-accent" />
          Maintenance Mode
        </h1>
        <p className="mt-1 text-sm text-app-muted">
          Schalte die App vorübergehend in den Wartungsmodus
        </p>
      </div>

      {/* Status */}
      <div
        className={`rounded-2xl border p-6 ${
          settings.enabled
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-green-500/30 bg-green-500/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                settings.enabled ? 'bg-red-500/10' : 'bg-green-500/10'
              }`}
            >
              <Power
                className={`w-6 h-6 ${
                  settings.enabled ? 'text-red-500' : 'text-green-500'
                }`}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {settings.enabled ? 'Maintenance Mode AKTIV' : 'System läuft normal'}
              </h2>
              <p className="text-sm text-app-muted">
                {settings.enabled
                  ? 'Benutzer sehen die Wartungsseite'
                  : 'Alle Funktionen sind verfügbar'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleToggle}
            disabled={saving}
            variant={settings.enabled ? 'outline' : 'default'}
            className={settings.enabled ? '' : 'bg-red-500 hover:bg-red-600'}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Power className="w-4 h-4 mr-1" />
            )}
            {settings.enabled ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
        </div>
      </div>

      {/* Warning */}
      {settings.enabled && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-400">
              <strong>Achtung:</strong> Während des Maintenance Modes können Benutzer 
              keine Fotos hochladen oder auf ihre Events zugreifen.
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6">
        <h2 className="text-lg font-semibold mb-4">Wartungsnachricht</h2>
        <Textarea
          value={settings.message}
          onChange={(e) => setSettings({ ...settings, message: e.target.value })}
          placeholder="Nachricht für Benutzer..."
          rows={4}
        />
        <p className="text-xs text-app-muted mt-2">
          Diese Nachricht wird Benutzern während der Wartung angezeigt.
        </p>
        <Button
          size="sm"
          onClick={handleSaveMessage}
          disabled={saving}
          className="mt-4"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Nachricht speichern
        </Button>
      </div>
    </div>
  );
}
