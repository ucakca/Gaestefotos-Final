'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import * as Icons from 'lucide-react';
import { AlbumConfig } from '../types';
import { Plus, Lock } from 'lucide-react';

interface AlbumsStepProps {
  albums: AlbumConfig[];
  onAlbumsChange: (albums: AlbumConfig[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function AlbumsStep({ albums, onAlbumsChange, onNext, onBack }: AlbumsStepProps) {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const handleToggleAlbum = (id: string) => {
    onAlbumsChange(albums.map((album) => (album.id === id ? { ...album, enabled: !album.enabled } : album)));
  };

  const handleAddCustomAlbum = () => {
    if (!customLabel.trim()) return;

    const newAlbum: AlbumConfig = {
      id: `custom-${Date.now()}`,
      label: customLabel,
      icon: 'Images',
      enabled: true,
      hostOnly: false,
    };

    onAlbumsChange([...albums, newAlbum]);
    setCustomLabel('');
    setShowAddCustom(false);
  };

  const enabledCount = albums.filter((a) => a.enabled).length;
  const hasError = enabledCount === 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">In welche Alben sollen die Fotos?</h2>
        <p className="text-muted-foreground">Wähle vorgeschlagene Alben aus oder erstelle eigene</p>
        {hasError && (
          <p className="text-sm text-red-600 mt-2">⚠️ Bitte wähle mindestens ein Album aus</p>
        )}
      </div>

      <div className="space-y-3">
        {albums.map((album) => {
          const IconComponent = Icons[album.icon as keyof typeof Icons] as Icons.LucideIcon;

          return (
            <div key={album.id} className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox checked={album.enabled} onCheckedChange={() => handleToggleAlbum(album.id)} />
                {IconComponent && <IconComponent className="w-5 h-5 text-gray-600" />}
                <span className="flex-1 font-medium">{album.label}</span>
                {album.hostOnly && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span>Nur du</span>
                  </div>
                )}
              </div>
              {album.enabled && album.hint && (
                <p className="text-xs text-muted-foreground ml-11 -mt-1">💡 {album.hint}</p>
              )}
            </div>
          );
        })}
      </div>

      {showAddCustom ? (
        <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 space-y-3">
          <div className="text-sm font-medium text-foreground">Neues Album erstellen</div>
          <Input
            placeholder="z.B. Candy Bar, Photobooth..."
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomAlbum()}
            autoFocus
            className="text-base"
          />
          <div className="flex gap-2">
            <Button onClick={handleAddCustomAlbum} disabled={!customLabel.trim()} size="sm">
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
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5"
          title="Eigenes Album hinzufügen"
          aria-label="Eigenes Album hinzufügen"
        >
          <Plus className="w-6 h-6" />
          <span className="text-muted-foreground">Eigenes Album</span>
        </Button>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
        <Button onClick={onNext} disabled={enabledCount === 0}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
