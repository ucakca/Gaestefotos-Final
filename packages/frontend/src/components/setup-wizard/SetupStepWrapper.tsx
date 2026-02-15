'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SetupStepWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  onBack: () => void;
  isValid?: boolean;
  saveLabel?: string;
}

export default function SetupStepWrapper({
  title,
  description,
  children,
  onSave,
  onBack,
  isValid = true,
  saveLabel = 'Speichern',
}: SetupStepWrapperProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!isValid || saving) return;
    
    setSaving(true);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Error handling should be done in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full"
    >
      {/* Header with Breadcrumb */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-stone-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-stone-800 truncate">{title}</h2>
            {description && (
              <p className="text-xs text-stone-500 truncate">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>

      {/* Footer with Save Button */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-stone-200 p-4">
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          className={`w-full justify-center gap-2 ${
            saved 
              ? 'bg-success/100 hover:bg-success' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
          } text-white disabled:opacity-50`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Speichern...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Gespeichert!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {saveLabel}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
