'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload } from 'lucide-react';
import { ColorScheme } from '../types';

interface DesignStepProps {
  title: string;
  coverImage?: File;
  coverImagePreview?: string;
  profileImage?: File;
  profileImagePreview?: string;
  colorScheme: ColorScheme;
  onCoverImageChange: (file: File | undefined, preview: string | undefined) => void;
  onProfileImageChange: (file: File | undefined, preview: string | undefined) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DesignStep({
  title,
  coverImage,
  coverImagePreview,
  profileImage,
  profileImagePreview,
  colorScheme,
  onCoverImageChange,
  onProfileImageChange,
  onColorSchemeChange,
  onNext,
  onBack,
}: DesignStepProps) {
  const [coverShimmer, setCoverShimmer] = useState(false);
  const [profileShimmer, setProfileShimmer] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    file: File,
    type: 'cover' | 'profile'
  ) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (type === 'cover') {
        onCoverImageChange(file, preview);
        setCoverShimmer(true);
        setTimeout(() => setCoverShimmer(false), 600);
      } else {
        onProfileImageChange(file, preview);
        setProfileShimmer(true);
        setTimeout(() => setProfileShimmer(false), 600);
      }
    };
    reader.readAsDataURL(file);
  };

  const colorSchemes: { id: ColorScheme; label: string; colors: string }[] = [
    { id: 'elegant', label: 'Elegant', colors: 'bg-gradient-to-br from-amber-100 to-amber-50' },
    { id: 'romantic', label: 'Romantisch', colors: 'bg-gradient-to-br from-rose-100 to-pink-50' },
    { id: 'modern', label: 'Modern', colors: 'bg-gradient-to-br from-slate-200 to-slate-100' },
    { id: 'colorful', label: 'Bunt', colors: 'bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100' },
    { id: 'ocean', label: 'Ozean', colors: 'bg-gradient-to-br from-blue-100 to-cyan-50' },
    { id: 'forest', label: 'Natur', colors: 'bg-gradient-to-br from-green-100 to-emerald-50' },
    { id: 'sunset', label: 'Sonnenuntergang', colors: 'bg-gradient-to-br from-orange-100 via-rose-100 to-purple-50' },
    { id: 'custom', label: 'Benutzerdefiniert', colors: 'bg-gradient-to-br from-gray-100 to-gray-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Gestalte dein Event</h2>
        <p className="text-muted-foreground">Bilder und Farben</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Titelbild</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className={`
                relative h-48 border-2 border-dashed rounded-lg overflow-hidden cursor-pointer
                transition-all hover:border-primary
                ${coverShimmer ? 'animate-shimmer' : ''}
              `}
            >
              {coverImagePreview ? (
                <img src={coverImagePreview} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-sm">Klicken zum Hochladen</span>
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'cover');
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Profilbild</label>
            <div
              onClick={() => profileInputRef.current?.click()}
              className={`
                relative h-32 w-32 border-2 border-dashed rounded-full overflow-hidden cursor-pointer
                transition-all hover:border-primary
                ${profileShimmer ? 'animate-shimmer' : ''}
              `}
            >
              {profileImagePreview ? (
                <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Hochladen</span>
                </div>
              )}
            </div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, 'profile');
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">🎨 Farbschema</label>
            <p className="text-xs text-muted-foreground mb-3">
              Bestimmt die Farben für Header, Buttons und Akzente in der Gäste-App
            </p>
            <div className="grid grid-cols-2 gap-3">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => onColorSchemeChange(scheme.id)}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${colorScheme === scheme.id ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-border hover:border-border'}
                  `}
                >
                  <div className={`h-12 rounded mb-2 ${scheme.colors}`} />
                  <span className="text-sm font-medium">{scheme.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <label className="block text-sm font-medium mb-2">📱 Vorschau</label>
          <div className="border-4 border-foreground/90 rounded-3xl p-2 bg-foreground/90">
            <div className="bg-card rounded-2xl overflow-hidden">
              <div className="relative h-32">
                {coverImagePreview ? (
                  <img src={coverImagePreview} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${colorSchemes.find((s) => s.id === colorScheme)?.colors}`} />
                )}
              </div>
              <div className="px-4 py-3 -mt-8 relative">
                <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-muted/80">
                  {profileImagePreview && (
                    <img src={profileImagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="font-semibold text-sm">{title || 'Dein Event'}</h3>
                  <p className="text-xs text-muted-foreground">Gäste-App</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
        <Button onClick={onNext}>Weiter</Button>
      </div>
    </div>
  );
}
