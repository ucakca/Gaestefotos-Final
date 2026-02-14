'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepFaceSearch({ node, collectedData, onComplete, eventId }: StepRendererProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');

  const photo = collectedData.photo;
  const minSimilarity = node.data.config.minSimilarity || 0.6;

  const doSearch = async () => {
    if (!photo) {
      setError('Kein Referenzfoto vorhanden');
      return;
    }

    setSearching(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch(photo);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('reference', blob, 'reference.jpg');
      formData.append('minSimilarity', String(minSimilarity));

      const { data } = await api.post(`/events/${eventId}/face-search`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const found = data.results || [];
      setResults(found);

      if (found.length === 0) {
        setError('Keine passenden Fotos gefunden. Versuche ein anderes Foto!');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Fehler bei der Suche');
    } finally {
      setSearching(false);
    }
  };

  // Auto-search on mount if photo exists and no results yet
  if (photo && results.length === 0 && !searching && !error) {
    doSearch();
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <h3 className="text-lg font-bold text-app-fg">{node.data.label}</h3>

      {searching && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-10 h-10 text-app-accent animate-spin" />
          <p className="text-app-muted">Fotos werden durchsucht...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center max-w-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="text-sm font-medium text-app-fg mb-2">
            {results.length} Foto{results.length !== 1 ? 's' : ''} gefunden!
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {results.map((r: any) => (
              <div key={r.photoId} className="relative rounded-lg overflow-hidden">
                <img src={r.photoUrl} alt="" className="w-full aspect-square object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                  {Math.round(r.similarity * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onComplete('default', { faceSearchResults: results, faceSearchCount: results.length })}
        className="px-8 py-3 bg-app-accent text-white rounded-xl font-semibold flex items-center gap-2"
      >
        <Search className="w-4 h-4" /> Weiter
      </motion.button>
    </div>
  );
}
