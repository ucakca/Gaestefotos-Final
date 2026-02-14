'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import * as Icons from 'lucide-react';
import { ChallengeConfig } from '../types';
import { Plus } from 'lucide-react';

interface ChallengesStepProps {
  challenges: ChallengeConfig[];
  onChallengesChange: (challenges: ChallengeConfig[]) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function ChallengesStep({
  challenges,
  onChallengesChange,
  onNext,
  onSkip,
  onBack,
}: ChallengesStepProps) {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const handleToggleChallenge = (index: number) => {
    onChallengesChange(
      challenges.map((challenge, i) => (i === index ? { ...challenge, enabled: !challenge.enabled } : challenge))
    );
  };

  const handleAddCustomChallenge = () => {
    if (!customLabel.trim()) return;

    const newChallenge: ChallengeConfig = {
      label: customLabel,
      icon: 'Camera',
      enabled: true,
    };

    onChallengesChange([...challenges, newChallenge]);
    setCustomLabel('');
    setShowAddCustom(false);
  };

  const enabledCount = challenges.filter((c) => c.enabled).length;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Foto-Challenges für deine Gäste</h2>
        <p className="text-muted-foreground">Motiviere deine Gäste, bestimmte Momente festzuhalten</p>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge, index) => {
          const IconComponent = Icons[challenge.icon as keyof typeof Icons] as Icons.LucideIcon;

          return (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <Checkbox checked={challenge.enabled} onCheckedChange={() => handleToggleChallenge(index)} />
              {IconComponent && <IconComponent className="w-5 h-5 text-gray-600" />}
              <span className="flex-1 font-medium">{challenge.label}</span>
            </div>
          );
        })}
      </div>

      {showAddCustom ? (
        <div className="p-4 rounded-lg border-2 border-app-accent bg-app-accent/5 space-y-3">
          <div className="text-sm font-medium text-foreground">Neue Challenge erstellen</div>
          <Input
            placeholder="z.B. Lustigstes Selfie, Bestes Gruppenfoto..."
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomChallenge()}
            autoFocus
            className="text-base"
          />
          <div className="flex gap-2">
            <Button onClick={handleAddCustomChallenge} disabled={!customLabel.trim()} size="sm">
              Erstellen
            </Button>
            <Button variant="secondary" onClick={() => { setShowAddCustom(false); setCustomLabel(''); }} size="sm">
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          variant="secondary" 
          onClick={() => setShowAddCustom(true)} 
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border hover:border-app-accent hover:bg-app-accent/5"
          title="Eigene Challenge hinzufügen"
          aria-label="Eigene Challenge hinzufügen"
        >
          <Plus className="w-6 h-6" />
          <span className="text-muted-foreground">Eigene Challenge</span>
        </Button>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Zurück
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>
            Überspringen
          </Button>
          <Button onClick={onNext}>
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}
