'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X } from 'lucide-react';
import api from '@/lib/api';

interface LogoUploadProps {
  eventId: string;
  logoUrl?: string | null;
  onLogoChange?: (url: string | null) => void;
  disabled?: boolean;
}

export default function LogoUpload({
  eventId,
  logoUrl,
  onLogoChange,
  disabled = false,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Nur PNG, JPG und SVG Dateien erlaubt');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Datei zu groß (max. 5MB)');
      return;
    }

    try {
      setError(null);
      setUploading(true);

      const formData = new FormData();
      formData.append('logo', file);

      const res = await api.post(`/events/${eventId}/qr/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newLogoUrl = res.data.logoUrl;
      setPreviewUrl(newLogoUrl);
      onLogoChange?.(newLogoUrl);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Upload fehlgeschlagen');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    try {
      setError(null);
      setUploading(true);
      await api.delete(`/events/${eventId}/qr/logo`);
      setPreviewUrl(null);
      onLogoChange?.(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Löschen fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-app-fg">Logo (Optional)</div>

      {previewUrl ? (
        <div className="space-y-2">
          <div className="relative w-full h-32 bg-app-bg rounded-lg border border-app-border overflow-hidden">
            <img
              src={previewUrl}
              alt="Logo Preview"
              className="w-full h-full object-contain p-2"
            />
          </div>
          <Button
            type="button"
            onClick={handleRemove}
            variant="secondary"
            disabled={uploading || disabled}
            className="w-full"
          >
            <X className="h-4 w-4" />
            Logo entfernen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            className="hidden"
          />
          <Button
            type="button"
            onClick={handleButtonClick}
            variant="secondary"
            disabled={uploading || disabled}
            className="w-full"
          >
            {uploading ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Logo hochladen
              </>
            )}
          </Button>
          <p className="text-xs text-app-muted">
            PNG, JPG oder SVG (max. 5MB)
          </p>
        </div>
      )}

      {error && (
        <div className="text-sm text-status-danger">{error}</div>
      )}
    </div>
  );
}
