'use client';

import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, categoryId?: string, uploaderName?: string, alsoInGuestbook?: boolean) => void;
  categories?: Array<{ id: string; name: string }>;
  accept?: string;
  title?: string;
  showGuestbookOption?: boolean;
}

export default function UploadModal({
  open,
  onClose,
  onUpload,
  categories = [],
  accept = 'image/*',
  title = 'Datei hochladen',
  showGuestbookOption = false,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploaderName, setUploaderName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [alsoInGuestbook, setAlsoInGuestbook] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onUpload(
        selectedFile,
        selectedCategory || undefined,
        showNameField && uploaderName.trim() ? uploaderName.trim() : undefined,
        alsoInGuestbook
      );
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedCategory('');
    setUploaderName('');
    setShowNameField(false);
    setAlsoInGuestbook(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? null : handleClose())}>
      <DialogContent className="bg-app-card border border-app-border rounded-lg max-w-md w-full p-6">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold text-app-fg">{title}</DialogTitle>
            <DialogClose asChild>
              <button onClick={handleClose} className="text-app-muted hover:text-app-fg" type="button">
                <X className="w-5 h-5" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-fg mb-2">Datei auswählen</label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-app-border rounded-lg cursor-pointer hover:border-tokens-brandGreen transition-colors">
              <Upload className="w-5 h-5 text-app-muted" />
              <span className="text-sm text-app-muted">{selectedFile ? selectedFile.name : 'Klicken zum Auswählen'}</span>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileSelect}
                required
              />
            </label>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-app-fg mb-2">Album (optional)</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm text-app-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tokens-brandGreen/30"
              >
                <option value="">Kein Album</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-app-fg mb-2">
              <input
                type="checkbox"
                checked={showNameField}
                onChange={(e) => setShowNameField(e.target.checked)}
                className="h-4 w-4 accent-tokens-brandGreen"
              />
              <span>Meinen Namen angeben (optional)</span>
            </label>
            {showNameField && (
              <Input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                placeholder="Ihr Name"
                className="mt-2"
              />
            )}
          </div>

          {showGuestbookOption && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-app-fg">
                <input
                  type="checkbox"
                  checked={alsoInGuestbook}
                  onChange={(e) => setAlsoInGuestbook(e.target.checked)}
                  className="h-4 w-4 accent-tokens-brandGreen"
                />
                <span>Auch im Gästebuch eintragen</span>
              </label>
              {alsoInGuestbook && (
                <p className="text-xs text-app-muted mt-1 ml-6">
                  Das Foto wird auch als Gästebuch-Eintrag mit Sprechblase im Feed angezeigt
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                Abbrechen
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!selectedFile} className="flex-1" variant="primary">
              Hochladen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


