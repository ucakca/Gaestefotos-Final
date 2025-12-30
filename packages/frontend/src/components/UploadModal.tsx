'use client';

import { useState } from 'react';
import { X, Upload, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-app-fg/50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-app-card border border-app-border rounded-lg max-w-md w-full p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-app-fg">
              {title}
            </h2>
            <button
              onClick={handleClose}
              className="text-app-muted hover:text-app-fg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-fg mb-2">
                Datei auswählen
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-app-border rounded-lg cursor-pointer hover:border-tokens-brandGreen transition-colors">
                <Upload className="w-5 h-5 text-app-muted" />
                <span className="text-sm text-app-muted">
                  {selectedFile ? selectedFile.name : 'Klicken zum Auswählen'}
                </span>
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
                <label className="block text-sm font-medium text-app-fg mb-2">
                  Album (optional)
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-app-fg bg-app-card"
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
                  className="rounded"
                />
                <span>Meinen Namen angeben (optional)</span>
              </label>
              {showNameField && (
                <input
                  type="text"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Ihr Name"
                  className="w-full px-3 py-2 border border-app-border rounded-lg text-app-fg bg-app-card mt-2"
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
                    className="rounded"
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
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-app-bg text-app-fg rounded-lg hover:opacity-90 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!selectedFile}
                className="flex-1 px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hochladen
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


