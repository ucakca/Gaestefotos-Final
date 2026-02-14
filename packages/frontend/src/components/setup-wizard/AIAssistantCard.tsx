'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, RefreshCw, Loader2, Zap, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AIAssistantCardProps {
  title?: string;
  description?: string;
  suggestions: string[];
  isLoading?: boolean;
  onSelect: (selected: string[]) => void;
  onAccept?: (selected: string[]) => void; // Called when user explicitly accepts selection
  onGenerateMore?: () => void;
  onCustomInput?: () => void;
  type?: 'albums' | 'challenges' | 'text';
  multiSelect?: boolean;
}

export default function AIAssistantCard({
  title = 'KI-Vorschläge',
  description,
  suggestions,
  isLoading = false,
  onSelect,
  onAccept,
  onGenerateMore,
  onCustomInput,
  type = 'albums',
  multiSelect = true,
}: AIAssistantCardProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleAccept = () => {
    const selected = Array.from(selectedItems);
    if (onAccept) {
      onAccept(selected);
    } else {
      onSelect(selected);
    }
  };

  const toggleItem = (item: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Gradient Border Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 opacity-50" />
      
      <div className="relative m-[2px] bg-card rounded-[14px] p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground flex items-center gap-1">
              ✨ {title}
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {selectedItems.size > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {selectedItems.size} ausgewählt
            </span>
          )}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 flex flex-col items-center justify-center gap-2"
            >
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              <p className="text-sm text-muted-foreground">KI generiert Vorschläge...</p>
            </motion.div>
          ) : (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {type === 'text' ? (
                <div className="bg-background rounded-xl p-3 mb-4">
                  <p className="text-foreground text-sm italic">"{suggestions[0]}"</p>
                </div>
              ) : (
                <ul className="space-y-2 mb-4">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = selectedItems.has(suggestion);
                    return (
                      <motion.li
                        key={`${suggestion}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <button
                          onClick={() => toggleItem(suggestion)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                            isSelected 
                              ? 'bg-purple-50 border-2 border-purple-400' 
                              : 'bg-background border-2 border-transparent hover:border-purple-200'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-purple-500' 
                              : 'border-2 border-border'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm ${isSelected ? 'text-purple-900 font-medium' : 'text-foreground'}`}>
                            {suggestion}
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {/* Accept Button - Only show when items are selected */}
                {selectedItems.size > 0 && (
                  <Button
                    onClick={handleAccept}
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {selectedItems.size} übernehmen
                  </Button>
                )}
                <div className="flex gap-2">
                  {onGenerateMore && (
                    <Button
                      onClick={onGenerateMore}
                      size="sm"
                      variant="ghost"
                      className="flex-1 border border-purple-200 text-purple-600 hover:bg-purple-50"
                      disabled={isLoading}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Mehr
                    </Button>
                  )}
                  {onCustomInput && (
                    <Button
                      onClick={onCustomInput}
                      size="sm"
                      variant="ghost"
                      className="flex-1 border border-border"
                    >
                      <PenLine className="w-4 h-4 mr-1" />
                      Eigene
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Powered by KI Badge */}
        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>Powered by KI</span>
        </div>
      </div>
    </motion.div>
  );
}
