'use client';

import { Button } from '@/components/ui/Button';
import { WizardState } from '../types';
import { Calendar, Lock, FolderOpen, Trophy, BookOpen, Users } from 'lucide-react';
import MapsLink from '@/components/MapsLink';

interface SummaryStepProps {
  state: WizardState;
  onFinish: () => void;
  onBack: () => void;
  isCreating: boolean;
}

export default function SummaryStep({ state, onFinish, onBack, isCreating }: SummaryStepProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const enabledAlbums = state.albums.filter((a) => a.enabled);
  const enabledChallenges = state.challenges.filter((c) => c.enabled);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">✨ Alles bereit!</h2>
        <p className="text-muted-foreground">Überprüfe deine Einstellungen und erstelle dein Event</p>
      </div>

      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{state.title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(state.dateTime)}
              {formatTime(state.dateTime) && `, ${formatTime(state.dateTime)}`}
            </span>
          </div>
          {state.location && (
            <div className="mt-1">
              <p className="text-sm text-muted-foreground">📍 {state.location}</p>
              <MapsLink address={state.location} className="text-sm mt-1" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4" />
          <span>Passwort: {state.password}</span>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <FolderOpen className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium mb-1">{enabledAlbums.length} Alben</h3>
            <p className="text-sm text-muted-foreground">{enabledAlbums.map((a) => a.label).join(', ')}</p>
          </div>
        </div>

        {state.isExtendedMode && (
          <>
            {enabledChallenges.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Trophy className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{enabledChallenges.length} Challenges</h3>
                  <p className="text-sm text-muted-foreground">
                    {enabledChallenges.map((c) => c.label).slice(0, 3).join(', ')}
                    {enabledChallenges.length > 3 && ` +${enabledChallenges.length - 3} weitere`}
                  </p>
                </div>
              </div>
            )}

            {state.guestbookEnabled && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Gästebuch aktiv</h3>
                  <p className="text-sm text-muted-foreground">{state.guestbookMessage}</p>
                </div>
              </div>
            )}

            {state.coHostEmails.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{state.coHostEmails.length} Co-Host Einladungen</h3>
                  <p className="text-sm text-muted-foreground">{state.coHostEmails.join(', ')}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-sm text-center text-muted-foreground">
        💡 Alle Einstellungen können später im Dashboard geändert werden
      </p>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack} disabled={isCreating}>
          Zurück
        </Button>
        <Button onClick={onFinish} disabled={isCreating} size="lg">
          {isCreating ? 'Event wird erstellt...' : '🚀 Event jetzt erstellen'}
        </Button>
      </div>
    </div>
  );
}
