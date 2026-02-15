'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import { VisibilityMode } from '../types';

interface AccessStepProps {
  password: string;
  visibilityMode: VisibilityMode;
  onPasswordChange: (password: string) => void;
  onVisibilityModeChange: (mode: VisibilityMode) => void;
  onQuickFinish: () => void;
  onExtendedMode: () => void;
  onBack: () => void;
}

export default function AccessStep({
  password,
  visibilityMode,
  onPasswordChange,
  onVisibilityModeChange,
  onQuickFinish,
  onExtendedMode,
  onBack,
}: AccessStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  const canProceed = password.trim().length === 0 || password.trim().length >= 4;
  const passwordError = password.length > 0 && password.length < 4 ? 'Passwort muss mindestens 4 Zeichen haben' : '';

  const modes: { id: VisibilityMode; label: string; description: string }[] = [
    { id: 'instant', label: 'Sofort sichtbar', description: 'Fotos sind direkt für alle sichtbar' },
    { id: 'mystery', label: 'Mystery Mode', description: 'Fotos werden erst nach dem Event gezeigt' },
    { id: 'moderated', label: 'Moderation', description: 'Du genehmigst jedes Foto vor Veröffentlichung' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Wie sollen Gäste beitreten?</h2>
        <p className="text-muted-foreground">Zugang und Sichtbarkeit festlegen</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            🔐 Event-Passwort (optional)
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mindestens 4 Zeichen (leer lassen für offenen Zugang)"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={`pr-10 ${passwordError ? 'border-destructive' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-sm text-destructive mt-1">{passwordError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">💡 Teile das Passwort mit deinen Gästen (z.B. auf Einladungen oder QR-Code)</p>
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">ℹ️ Hinweis zum Passwort</p>
            <p className="text-xs text-blue-700 mt-1">Ein Passwort schützt dein Event vor unerwünschten Uploads. Du kannst aber auch ohne Passwort starten und es später jederzeit hinzufügen.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">📸 Foto-Sichtbarkeit</label>
          <div className="space-y-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onVisibilityModeChange(mode.id)}
                className={`
                  w-full text-left p-4 rounded-lg border-2 transition-all
                  ${visibilityMode === mode.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      visibilityMode === mode.id ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {visibilityMode === mode.id && <div className="w-2 h-2 bg-card rounded-full m-0.5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-sm text-muted-foreground">{mode.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <Button onClick={onQuickFinish} disabled={!canProceed} size="lg" className="w-full">
          🚀 Jetzt starten & QR-Code erhalten
        </Button>

        <div className="text-center text-sm text-muted-foreground">oder</div>

        <Button variant="secondary" onClick={onExtendedMode} disabled={!canProceed} className="w-full">
          ⚙️ Erweiterte Features einrichten
        </Button>
        <p className="text-xs text-center text-muted-foreground">Challenges, Gästebuch, Co-Hosts</p>
      </div>

      <div className="flex justify-start pt-4">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
      </div>
    </div>
  );
}
