'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, FolderOpen, Plus, X, Sparkles, SkipForward, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AlbumConfig } from '../types';
import AIAssistantCard from '../AIAssistantCard';
import { useAISuggestions } from '../hooks/useAISuggestions';

interface AlbumsStepProps {
  albums: AlbumConfig[];
  eventType: string;
  eventTitle: string;
  onAlbumsChange: (albums: AlbumConfig[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function AlbumsStep({
  albums,
  eventType,
  eventTitle,
  onAlbumsChange,
  onNext,
  onBack,
  onSkip,
}: AlbumsStepProps) {
  const [showAI, setShowAI] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const { isLoading: isLoadingAI, suggestAlbums } = useAISuggestions();

  const handleGenerateAI = async () => {
    setShowAI(true);
    setAiSuggestions([]);
    try {
      const suggestions = await suggestAlbums(eventType, eventTitle);
      setAiSuggestions(suggestions);
    } catch (error) {
      // Fallback suggestions based on event type
      const fallbackSuggestions = getFallbackAlbums(eventType);
      setAiSuggestions(fallbackSuggestions);
    }
  };

  const getFallbackAlbums = (type: string): string[] => {
    const typeLC = type.toLowerCase();
    if (typeLC.includes('hochzeit') || typeLC.includes('wedding')) {
      return ['Zeremonie', 'Empfang', 'Torte', 'Erster Tanz', 'Gäste', 'Details'];
    } else if (typeLC.includes('geburtstag') || typeLC.includes('birthday')) {
      return ['Geschenke', 'Kuchen & Kerzen', 'Party', 'Gäste', 'Highlights'];
    } else if (typeLC.includes('firmen') || typeLC.includes('corporate')) {
      return ['Vorträge', 'Networking', 'Team', 'Location', 'Highlights'];
    }
    return ['Highlights', 'Gäste', 'Location', 'Besondere Momente', 'Details'];
  };

  const handleToggleAlbum = (id: string) => {
    onAlbumsChange(
      albums.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)
    );
  };

  const handleAddAlbum = () => {
    if (!newAlbumName.trim()) return;
    
    const newAlbum: AlbumConfig = {
      id: `custom-${Date.now()}`,
      name: newAlbumName.trim(),
      enabled: true,
      isCustom: true,
    };
    
    onAlbumsChange([...albums, newAlbum]);
    setNewAlbumName('');
  };

  const handleRemoveAlbum = (id: string) => {
    onAlbumsChange(albums.filter(a => a.id !== id));
  };

  const enabledCount = albums.filter(a => a.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Alben einrichten 📁
        </motion.h2>
        <p className="text-muted-foreground">Organisiere die Fotos in Kategorien</p>
      </div>

      {/* AI Suggestion Button - Always visible when not showing AI card */}
      {!showAI && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleGenerateAI}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">
            {albums.length === 0 ? 'KI-Albumvorschläge generieren' : 'Mehr KI-Vorschläge'}
          </span>
        </motion.button>
      )}

      {showAI && (
        <AIAssistantCard
          title="Album-Vorschläge"
          description={`Passend für "${eventType}"`}
          suggestions={aiSuggestions}
          isLoading={isLoadingAI}
          type="albums"
          onSelect={() => {}}
          onAccept={(selected) => {
            // Create new albums from selected suggestions
            const existingNames = albums.map(a => a.name.toLowerCase());
            const newAlbums: AlbumConfig[] = selected
              .filter(name => !existingNames.includes(name.toLowerCase()))
              .map((name, i) => ({
                id: `ai-${Date.now()}-${i}`,
                name,
                enabled: true,
                isCustom: false,
              }));
            if (newAlbums.length > 0) {
              onAlbumsChange([...albums, ...newAlbums]);
            }
            setShowAI(false);
          }}
          onGenerateMore={handleGenerateAI}
          onCustomInput={() => setShowAI(false)}
        />
      )}

      {/* Albums List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {albums.map((album, index) => (
          <motion.div
            key={album.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
              album.enabled
                ? 'border-amber-200 bg-amber-50'
                : 'border-border bg-card'
            }`}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            
            <button
              onClick={() => handleToggleAlbum(album.id)}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                album.enabled
                  ? 'border-amber-500 bg-amber-500'
                  : 'border-border'
              }`}
            >
              {album.enabled && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <FolderOpen className={`w-5 h-5 ${album.enabled ? 'text-amber-600' : 'text-muted-foreground'}`} />
            
            <span className={`flex-1 font-medium ${album.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
              {album.name}
            </span>
            
            {album.isCustom && (
              <button
                onClick={() => handleRemoveAlbum(album.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Add Custom Album */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newAlbumName}
          onChange={(e) => setNewAlbumName(e.target.value)}
          placeholder="Neues Album hinzufügen..."
          className="flex-1 px-4 py-2 border-2 border-border rounded-xl focus:border-amber-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddAlbum()}
        />
        <Button
          onClick={handleAddAlbum}
          disabled={!newAlbumName.trim()}
          variant="ghost"
          className="px-4"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Counter */}
      <p className="text-sm text-muted-foreground text-center">
        {enabledCount} Album{enabledCount !== 1 ? 's' : ''} ausgewählt
      </p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button
            onClick={onNext}
            disabled={enabledCount === 0}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
