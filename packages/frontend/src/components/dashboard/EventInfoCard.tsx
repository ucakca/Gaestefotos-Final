'use client';

import { useState, useRef } from 'react';
import { Event as EventType } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { IconButton } from '@/components/ui/IconButton';
import DateTimePicker from '@/components/DateTimePicker';
import MapsLink from '@/components/MapsLink';
import {
  Camera,
  Image as ImageIcon,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Pencil,
  Users,
} from 'lucide-react';

interface EventInfoCardProps {
  event: EventType;
  onUpdate: (field: string, value: any) => Promise<void>;
  onDesignUpdate: (updates: any) => Promise<void>;
  onImageUpload: (type: 'profile' | 'cover', file: File) => Promise<void>;
  uploadingImage: string | null;
}

export function EventInfoCard({
  event,
  onUpdate,
  onDesignUpdate,
  onImageUpload,
  uploadingImage,
}: EventInfoCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const designConfig = (event.designConfig as any) || {};
  
  // Get image URLs
  const profileImageStoragePath = designConfig.profileImageStoragePath;
  const coverImageStoragePath = designConfig.coverImageStoragePath;
  const eventId = (event as any).id;
  
  const profileImage = profileImageStoragePath
    ? `/api/events/${eventId}/design-image/profile/${profileImageStoragePath}`
    : designConfig.profileImage || null;
  const coverImage = coverImageStoragePath
    ? `/api/events/${eventId}/design-image/cover/${coverImageStoragePath}`
    : designConfig.coverImage || null;
  const welcomeMessage = designConfig.welcomeMessage || '';

  const handleFieldSave = async (field: string, value: any) => {
    await onUpdate(field, value);
    setEditingField(null);
  };

  const handleWelcomeSave = async (message: string) => {
    await onDesignUpdate({ welcomeMessage: message });
    setEditingField(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Cover Image */}
      <div className="relative h-48 md:h-56 bg-muted">
        {coverImage ? (
          <img
            src={coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-16 h-16 opacity-30" />
          </div>
        )}
        
        {/* Cover Edit Button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 right-3 gap-2 bg-background/80 backdrop-blur-sm"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingImage === 'cover'}
        >
          <Camera className="w-4 h-4" />
          {uploadingImage === 'cover' ? 'Lädt...' : 'Titelbild'}
        </Button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload('cover', file);
          }}
        />

        {/* Profile Image - Positioned at bottom */}
        <div className="absolute -bottom-10 left-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-card bg-muted overflow-hidden shadow-lg">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Users className="w-8 h-8" />
                </div>
              )}
            </div>
            <IconButton
              icon={uploadingImage === 'profile' ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              variant="glass"
              size="sm"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full shadow-md bg-card"
              onClick={() => profileInputRef.current?.click()}
              disabled={uploadingImage === 'profile'}
              aria-label="Profilbild ändern"
              title="Profilbild ändern"
            />
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload('profile', file);
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 px-4 pb-4 space-y-1">
        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground">{event.title}</h2>

        {/* Editable Fields */}
        <div className="divide-y divide-border">
          {/* Date & Time */}
          <EditableRow
            icon={<Calendar className="w-5 h-5" />}
            label="Datum & Zeit"
            value={
              event.dateTime
                ? new Date(event.dateTime).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null
            }
            emptyText="Datum auswählen"
            required
            isEditing={editingField === 'dateTime'}
            onStartEdit={() => setEditingField('dateTime')}
            onCancel={() => setEditingField(null)}
            renderInput={() => (
              <DateTimePicker
                value={event.dateTime ? new Date(event.dateTime as any).toISOString() : ''}
                onChange={(value) => handleFieldSave('dateTime', value)}
                minDate={new Date(0)}
              />
            )}
          />

          {/* Location */}
          <EditableRow
            icon={<MapPin className="w-5 h-5" />}
            label="Veranstaltungsort"
            value={event.locationName}
            emptyText="Ort hinzufügen"
            isEditing={editingField === 'locationName'}
            onStartEdit={() => setEditingField('locationName')}
            onCancel={() => setEditingField(null)}
            renderInput={() => (
              <Input
                type="text"
                defaultValue={event.locationName || ''}
                onBlur={(e) => handleFieldSave('locationName', e.target.value || null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFieldSave('locationName', (e.target as HTMLInputElement).value || null);
                  }
                }}
                placeholder="z.B. Musterstraße 123, Berlin"
                autoFocus
              />
            )}
            renderValue={(value) => (
              <div className="flex items-center gap-2">
                <span>{value}</span>
                <MapsLink address={value} className="text-primary hover:underline text-sm" />
              </div>
            )}
          />

          {/* Welcome Message */}
          <EditableRow
            icon={<MessageSquare className="w-5 h-5" />}
            label="Willkommensnachricht"
            value={welcomeMessage}
            emptyText="Nachricht hinzufügen"
            isEditing={editingField === 'welcomeMessage'}
            onStartEdit={() => setEditingField('welcomeMessage')}
            onCancel={() => setEditingField(null)}
            renderInput={() => (
              <Textarea
                defaultValue={welcomeMessage}
                onBlur={(e) => handleWelcomeSave(e.target.value)}
                placeholder="Schreibe eine Willkommensnachricht für deine Gäste..."
                className="resize-none"
                rows={3}
                autoFocus
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

interface EditableRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  emptyText: string;
  required?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  renderInput: () => React.ReactNode;
  renderValue?: (value: string) => React.ReactNode;
}

function EditableRow({
  icon,
  label,
  value,
  emptyText,
  required,
  isEditing,
  onStartEdit,
  onCancel,
  renderInput,
  renderValue,
}: EditableRowProps) {
  const hasValue = value && value.trim().length > 0;

  return (
    <div className="py-3">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
      </div>

      {isEditing ? (
        <div className="ml-8">
          {renderInput()}
        </div>
      ) : (
        <button
          onClick={onStartEdit}
          className="group w-full text-left ml-8 flex items-center gap-2"
        >
          {hasValue ? (
            <>
              {renderValue ? (
                renderValue(value!)
              ) : (
                <span className="text-foreground">{value}</span>
              )}
              <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          ) : (
            <span className={`italic ${required ? 'text-destructive' : 'text-muted-foreground'}`}>
              {emptyText}
              {required && ' *'}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default EventInfoCard;
