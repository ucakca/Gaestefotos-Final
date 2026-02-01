'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import toast from 'react-hot-toast';

interface GeneralSettings {
  siteName: string;
  supportEmail: string;
  consentText: string;
  footerText: string;
}

export default function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GeneralSettings>({
    siteName: 'Gästefotos',
    supportEmail: 'support@gaestefotos.com',
    consentText: '',
    footerText: '',
  });
  const [originalSettings, setOriginalSettings] = useState<GeneralSettings | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ settings: GeneralSettings }>('/admin/settings/general');
      setSettings(res.data.settings);
      setOriginalSettings(res.data.settings);
    } catch {
      // Use defaults
      setOriginalSettings(settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings/general', settings);
      setOriginalSettings(settings);
      toast.success('Einstellungen gespeichert');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Settings className="w-6 h-6 text-app-accent" />
            Allgemeine Einstellungen
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Globale App-Einstellungen verwalten
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Verwerfen
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      {/* Settings Form */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6 space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Site Name</label>
          <Input
            value={settings.siteName}
            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            placeholder="Gästefotos"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Support E-Mail</label>
          <Input
            type="email"
            value={settings.supportEmail}
            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            placeholder="support@gaestefotos.com"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Consent Text (DSGVO)</label>
          <Textarea
            value={settings.consentText}
            onChange={(e) => setSettings({ ...settings, consentText: e.target.value })}
            placeholder="Mit dem Upload stimme ich der Verarbeitung meiner Daten zu..."
            rows={4}
          />
          <p className="text-xs text-app-muted mt-1">
            Wird beim Foto-Upload angezeigt
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Footer Text</label>
          <Textarea
            value={settings.footerText}
            onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
            placeholder="© 2026 Gästefotos. Alle Rechte vorbehalten."
            rows={2}
          />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-400">
          💡 <strong>Hinweis:</strong> Änderungen werden sofort auf allen Seiten wirksam.
        </p>
      </div>
    </div>
  );
}
