'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wifi, Eye, EyeOff, ArrowLeft, Save, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function WifiSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiPasswordConfirm, setWifiPasswordConfirm] = useState('');

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        const event = data.event;
        setEventTitle(event.title || '');
        setWifiName(event.wifiName || '');
        setWifiPassword(event.wifiPassword || '');
        setWifiPasswordConfirm(event.wifiPassword || '');
      } catch {
        showToast('Fehler beim Laden', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [eventId]);

  const handleSave = async () => {
    // Validate password confirmation
    if (wifiPassword && wifiPassword !== wifiPasswordConfirm) {
      showToast('Passwörter stimmen nicht überein', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/events/${eventId}`, {
        wifiName: wifiName.trim() || null,
        wifiPassword: wifiPassword.trim() || null,
      });
      showToast('WLAN-Einstellungen gespeichert', 'success');
      router.push(`/events/${eventId}`);
    } catch {
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await api.put(`/events/${eventId}`, {
        wifiName: null,
        wifiPassword: null,
      });
      setWifiName('');
      setWifiPassword('');
      setWifiPasswordConfirm('');
      showToast('WLAN-Einstellungen gelöscht', 'success');
    } catch {
      showToast('Fehler beim Löschen', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const passwordsMatch = !wifiPassword || wifiPassword === wifiPasswordConfirm;
  const hasChanges = wifiName.trim() !== '' || wifiPassword.trim() !== '';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push(`/events/${eventId}`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Event
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wifi className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">WLAN für Gäste</h1>
              <p className="text-muted-foreground text-sm">{eventTitle}</p>
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6"
        >
          <p className="text-sm text-foreground">
            <strong>💡 Tipp:</strong> Wenn du WLAN-Daten hinterlegst, sehen deine Gäste 
            einen praktischen Banner mit den Zugangsdaten. So können sie sich schnell 
            verbinden und Fotos hochladen - ohne ihr Datenvolumen zu verbrauchen!
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 space-y-6"
        >
          {/* WLAN Name */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              WLAN-Name (SSID)
            </label>
            <Input
              type="text"
              value={wifiName}
              onChange={(e) => setWifiName(e.target.value)}
              placeholder="z.B. Hochzeit-Lisa-Max"
              className="px-4 py-3"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Der Name deines WLANs, wie er auf den Geräten angezeigt wird
            </p>
          </div>

          {/* WLAN Password */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              WLAN-Passwort
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Dein WLAN-Passwort"
                className="px-4 py-3 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Confirmation - only show when password is entered */}
          {wifiPassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label className="block text-sm font-medium mb-2 text-foreground">
                Passwort bestätigen
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={wifiPasswordConfirm}
                onChange={(e) => setWifiPasswordConfirm(e.target.value)}
                placeholder="Passwort erneut eingeben"
                className={`px-4 py-3 ${!passwordsMatch ? 'border-red-500 focus:ring-red-500' : ''}`}
              />
              {!passwordsMatch && (
                <p className="mt-1.5 text-sm text-red-500">
                  Passwörter stimmen nicht überein
                </p>
              )}
            </motion.div>
          )}

          {/* No password hint */}
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="text-lg">🔓</span>
            Kein Passwort? Lass das Feld einfach leer.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={handleSave}
            disabled={saving || !passwordsMatch}
            variant="primary"
            className="flex-1 justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Speichern
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleClear}
              disabled={saving}
              variant="secondary"
              className="justify-center"
            >
              WLAN entfernen
            </Button>
          )}
        </motion.div>

        {/* Preview */}
        {wifiName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Vorschau für Gäste</h3>
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Kostenloses WLAN verfügbar</p>
                  <p className="text-sm text-muted-foreground">
                    Netzwerk: <span className="font-medium">{wifiName}</span>
                    {wifiPassword && ' • Passwortgeschützt'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
