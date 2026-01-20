'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';

interface LogoUploadProps {
  eventId: string;
  currentLogoUrl?: string;
  onLogoChange: (logoUrl: string | null) => void;
  disabled?: boolean;
}

export default function LogoUpload({
  eventId,
  currentLogoUrl,
  onLogoChange,
  disabled = false,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Bitte wählen Sie eine Bilddatei aus');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Datei ist zu groß (max. 5MB)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post(`/events/${eventId}/qr/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const logoUrl = response.data.logoUrl;
      setPreviewUrl(logoUrl);
      onLogoChange(logoUrl);
      setUploading(false);
    } catch (err) {
      console.error('Logo upload error:', err);
      setError('Upload fehlgeschlagen');
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!previewUrl) return;

    setUploading(true);
    setError(null);

    try {
      await api.delete(`/events/${eventId}/qr/logo`);
      setPreviewUrl(null);
      onLogoChange(null);
      setUploading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Logo remove error:', err);
      setError('Löschen fehlgeschlagen');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-app-fg">Logo / Foto (Optional)</div>
      
      {previewUrl ? (
        <div className="space-y-3">
          <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden border-2 border-app-border bg-app-bg">
            <img
              src={previewUrl}
              alt="Logo Preview"
              className="w-full h-full object-contain"
            />
          </div>
          
          <Button
            onClick={handleRemoveLogo}
            disabled={disabled || uploading}
            variant="outline"
            className="w-full"
          >
            <X className="h-4 w-4" />
            {uploading ? 'Entferne…' : 'Logo entfernen'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id="logo-upload-input"
          />
          
          <Button
            onClick={() => document.getElementById('logo-upload-input')?.click()}
            disabled={disabled || uploading}
            variant="outline"
            className="w-full"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Lädt hoch…' : 'Logo hochladen'}
          </Button>
          
          <div className="text-xs text-app-muted">
            PNG, JPG oder SVG (max. 5MB)
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-status-danger">{error}</div>
      )}
    </div>
  );
}
