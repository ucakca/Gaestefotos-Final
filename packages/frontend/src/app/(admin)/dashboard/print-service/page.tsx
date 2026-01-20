'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface PrintServiceSettings {
  id: string;
  enabled: boolean;
  productIdA6: string | null;
  productIdA5: string | null;
  priceA6: number | null;
  priceA5: number | null;
  wordpressUrl: string | null;
}

export default function PrintServiceSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PrintServiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await api.get('/print-service/settings');
      setSettings(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await api.post('/print-service/settings', settings);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestCheckout() {
    if (!settings) return;

    try {
      const res = await api.post('/print-service/checkout-url', {
        eventId: 'test-event-id',
        designId: 'test-design-id',
        format: 'A6',
        quantity: 1,
      });

      window.open(res.data.checkoutUrl, '_blank');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate test URL');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Druckservice Einstellungen</h1>
          <p>Lädt...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Druckservice Einstellungen</h1>
          <p className="text-status-danger">Fehler beim Laden der Einstellungen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Druckservice Einstellungen</h1>
          <p className="text-app-muted mt-1">
            Konfiguriere die Integration mit WooCommerce für QR-Code Druckservice
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-status-danger/10 border border-status-danger rounded-lg text-status-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-status-success/10 border border-status-success rounded-lg text-status-success">
            Einstellungen erfolgreich gespeichert!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <div className="p-6 border-b border-app-border">
              <h3 className="text-lg font-semibold">Aktivierung</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Druckservice aktivieren</p>
                  <p className="text-sm text-app-muted">
                    Zeigt "Jetzt drucken lassen" Button im QR-Styler
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="w-10 h-6"
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b border-app-border">
              <h3 className="text-lg font-semibold">WooCommerce Integration</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  WordPress URL
                </label>
                <Input
                  type="url"
                  placeholder="https://gaestefotos.com"
                  value={settings.wordpressUrl || ''}
                  onChange={(e) => setSettings({ ...settings, wordpressUrl: e.target.value })}
                />
                <p className="text-xs text-app-muted mt-1">
                  Haupt-URL deiner WordPress Installation
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    WooCommerce Product ID (A6)
                  </label>
                  <Input
                    type="text"
                    placeholder="123"
                    value={settings.productIdA6 || ''}
                    onChange={(e) => setSettings({ ...settings, productIdA6: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    WooCommerce Product ID (A5)
                  </label>
                  <Input
                    type="text"
                    placeholder="124"
                    value={settings.productIdA5 || ''}
                    onChange={(e) => setSettings({ ...settings, productIdA5: e.target.value })}
                  />
                </div>
              </div>

              <p className="text-xs text-app-muted">
                Finde die Product IDs in WooCommerce → Produkte → Bearbeiten (URL zeigt ?post=123)
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b border-app-border">
              <h3 className="text-lg font-semibold">Preise (nur zur Anzeige)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-app-muted">
                Diese Preise werden nur im QR-Styler angezeigt. Die echten Preise werden aus WooCommerce geladen.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preis A6 (€)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="12.90"
                    value={settings.priceA6 || ''}
                    onChange={(e) => setSettings({ ...settings, priceA6: parseFloat(e.target.value) || null })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preis A5 (€)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="19.90"
                    value={settings.priceA5 || ''}
                    onChange={(e) => setSettings({ ...settings, priceA5: parseFloat(e.target.value) || null })}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b border-app-border">
              <h3 className="text-lg font-semibold">Test Integration</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-app-muted">
                Teste die Checkout URL Generierung (öffnet in neuem Tab)
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={handleTestCheckout}
                disabled={!settings.enabled || !settings.wordpressUrl}
              >
                Test Checkout URL generieren
              </Button>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichert...' : 'Einstellungen speichern'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Zurück
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
