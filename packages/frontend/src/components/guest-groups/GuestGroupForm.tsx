'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';

const guestGroupSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  description: z.string().max(500).optional(),
});
type GuestGroupFormData = z.infer<typeof guestGroupSchema>;

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
  const [color, setColor] = useState(initialData?.color || COLOR_PRESETS[0]);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GuestGroupFormData>({
    resolver: zodResolver(guestGroupSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    },
  });

  const onFormSubmit = async (data: GuestGroupFormData) => {
    try {
      setServerError(null);
      await onSubmit({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        color,
      });
    } catch (error) {
      setServerError('Fehler beim Speichern');
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <FormInput
        label="Name"
        placeholder="z.B. Familie, Freunde, Kollegen"
        maxLength={100}
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <FormInput
        label="Beschreibung (optional)"
        placeholder="Kurze Beschreibung der Gruppe"
        maxLength={500}
        error={errors.description?.message}
        {...register('description')}
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Farbe
        </label>
        <div className="grid grid-cols-8 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className={`w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
                color === preset ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Farbe ${preset}`}
            />
          ))}
        </div>
      </div>

      {serverError && (
        <div className="text-sm text-destructive">{serverError}</div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {initialData ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </form>
  );
}
