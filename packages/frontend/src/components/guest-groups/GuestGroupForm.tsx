'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface GuestGroupFormProps {
  initialData?: {
    name: string;
    description?: string;
    color: string;
  };
  onSubmit: (data: { name: string; description?: string; color: string }) => Promise<void>;
  onCancel: () => void;
}

const COLOR_PRESETS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function GuestGroupForm({ initialData, onSubmit, onCancel }: GuestGroupFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || COLOR_PRESETS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
    } catch (error) {
      setError('Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-app-fg mb-1">
          Name *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Familie, Freunde, Kollegen"
          maxLength={100}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-app-fg mb-1">
          Beschreibung (optional)
        </label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Kurze Beschreibung der Gruppe"
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-app-fg mb-2">
          Farbe
        </label>
        <div className="grid grid-cols-8 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className={`w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
                color === preset ? 'ring-2 ring-app-accent ring-offset-2' : ''
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Farbe ${preset}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-status-danger">{error}</div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Abbrechen
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Speichern...' : initialData ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </form>
  );
}
