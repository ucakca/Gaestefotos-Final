'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Trophy, Plus, X, Sparkles, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChallengeConfig } from '../types';
import AIAssistantCard from '../AIAssistantCard';
import { useAISuggestions } from '../hooks/useAISuggestions';

interface ChallengesStepProps {
  challenges: ChallengeConfig[];
  eventType: string;
  onChallengesChange: (challenges: ChallengeConfig[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ChallengesStep({
  challenges,
  eventType,
  onChallengesChange,
  onNext,
  onBack,
  onSkip,
}: ChallengesStepProps) {
  const [showAI, setShowAI] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description: string }[]>([]);
  const { isLoading: isLoadingAI, suggestChallenges } = useAISuggestions();

  const handleGenerateAI = async () => {
    setShowAI(true);
    try {
      const suggestions = await suggestChallenges(eventType);
      setAiSuggestions(suggestions);
    } catch (error) {
      // Fallback
      setAiSuggestions([
        { title: 'Gruppenfoto', description: 'Sammelt so viele Leute wie möglich!' },
        { title: 'Bestes Lachen', description: 'Fangt den lustigsten Moment ein!' },
        { title: 'Food-Foto', description: 'Zeigt das leckerste Essen!' },
      ]);
    }
  };

  const handleAcceptAI = () => {
    const newChallenges: ChallengeConfig[] = aiSuggestions.map((s, i) => ({
      id: `ai-${Date.now()}-${i}`,
      title: s.title,
      description: s.description,
      enabled: true,
    }));
    onChallengesChange([...challenges, ...newChallenges]);
    setShowAI(false);
  };

  const handleAddCustomChallenge = () => {
    if (customTitle.trim()) {
      const newChallenge: ChallengeConfig = {
        id: `custom-${Date.now()}`,
        title: customTitle.trim(),
        description: customDescription.trim() || 'Eigene Challenge',
        enabled: true,
      };
      onChallengesChange([...challenges, newChallenge]);
      setCustomTitle('');
      setCustomDescription('');
      setShowCustomInput(false);
    }
  };

  const handleToggleChallenge = (id: string) => {
    onChallengesChange(
      challenges.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  };

  const handleRemoveChallenge = (id: string) => {
    onChallengesChange(challenges.filter(c => c.id !== id));
  };

  const enabledCount = challenges.filter(c => c.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Foto-Challenges 🏆
        </motion.h2>
        <p className="text-gray-500">Motiviere Gäste mit lustigen Aufgaben</p>
      </div>

      {/* Custom Input Mode */}
      {showCustomInput && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-xl p-4 space-y-3"
        >
          <h4 className="font-medium text-gray-900">Eigene Challenge erstellen</h4>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Challenge-Titel (z.B. 'Bestes Selfie')"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
          <input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomInput(false)}
              className="flex-1 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddCustomChallenge}
              disabled={!customTitle.trim()}
              className="flex-1 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hinzufügen
            </button>
          </div>
        </motion.div>
      )}

      {/* AI Suggestion - Always show button when not in custom input mode */}
      {!showAI && !showCustomInput && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2"
        >
          <button
            onClick={handleGenerateAI}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {challenges.length === 0 ? 'KI-Ideen generieren' : 'Mehr KI-Ideen'}
            </span>
          </button>
          <button
            onClick={() => setShowCustomInput(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Eigene</span>
          </button>
        </motion.div>
      )}

      {showAI && !showCustomInput && (
        <AIAssistantCard
          title="Challenge-Ideen"
          description={`Passend für "${eventType}"`}
          suggestions={aiSuggestions.map(s => s.title)}
          isLoading={isLoadingAI}
          type="challenges"
          onSelect={() => {}}
          onAccept={(selected) => {
            // Add selected challenges only when explicitly accepted
            const selectedSuggestions = aiSuggestions.filter(s => selected.includes(s.title));
            const newChallenges: ChallengeConfig[] = selectedSuggestions.map((s, i) => ({
              id: `ai-${Date.now()}-${i}`,
              title: s.title,
              description: s.description,
              enabled: true,
            }));
            if (newChallenges.length > 0) {
              onChallengesChange([...challenges, ...newChallenges]);
            }
            setShowAI(false);
          }}
          onGenerateMore={handleGenerateAI}
          onCustomInput={() => {
            setShowAI(false);
            setShowCustomInput(true);
          }}
        />
      )}

      {/* Challenges List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl border-2 transition-colors ${
              challenge.enabled
                ? 'border-amber-200 bg-amber-50'
                : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleToggleChallenge(challenge.id)}
                className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  challenge.enabled
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-gray-300'
                }`}
              >
                {challenge.enabled && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Trophy className={`w-4 h-4 ${challenge.enabled ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${challenge.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {challenge.title}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${challenge.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                  {challenge.description}
                </p>
              </div>
              
              <button
                onClick={() => handleRemoveChallenge(challenge.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {challenges.length === 0 && !showAI && (
        <div className="text-center py-8 text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Noch keine Challenges</p>
        </div>
      )}

      {/* Counter */}
      {challenges.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {enabledCount} Challenge{enabledCount !== 1 ? 's' : ''} aktiv
        </p>
      )}

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
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
