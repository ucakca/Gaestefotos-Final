'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Check, X as XIcon } from 'lucide-react';

interface CoHostsStepProps {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function CoHostsStep({ emails, onEmailsChange, onNext, onSkip, onBack }: CoHostsStepProps) {
  const [currentEmail, setCurrentEmail] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddEmail = () => {
    const email = currentEmail.trim();
    if (!email) return;

    if (!validateEmail(email)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein');
      return;
    }

    if (emails.includes(email)) {
      setError('Diese E-Mail-Adresse wurde bereits hinzugefügt');
      return;
    }

    onEmailsChange([...emails, email]);
    setCurrentEmail('');
    setError('');
  };

  const handleRemoveEmail = (index: number) => {
    onEmailsChange(emails.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Brauchst du Hilfe?</h2>
        <p className="text-muted-foreground">Lade Co-Hosts ein, die dir beim Moderieren helfen</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-blue-900">Co-Hosts können:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Fotos genehmigen/löschen
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            QR-Code herunterladen
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Gäste verwalten
          </li>
          <li className="flex items-center gap-2">
            <XIcon className="w-4 h-4" />
            Keine Paket-Änderungen
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            E-Mail-Adresse hinzufügen
          </label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="name@beispiel.de"
              value={currentEmail}
              onChange={(e) => {
                setCurrentEmail(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
            />
            <Button onClick={handleAddEmail}>Hinzufügen</Button>
          </div>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>

        {emails.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Eingeladene Co-Hosts ({emails.length})</h3>
            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">{email}</span>
                  <button
                    onClick={() => handleRemoveEmail(index)}
                    className="text-destructive hover:text-destructive"
                    aria-label="Entfernen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          💡 Du kannst Co-Hosts jederzeit mit einem Klick wieder entfernen.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Zurück
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>
            Überspringen
          </Button>
          <Button onClick={onNext}>Weiter</Button>
        </div>
      </div>
    </div>
  );
}
