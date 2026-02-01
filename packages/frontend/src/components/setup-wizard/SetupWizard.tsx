'use client';

import logger from '@/lib/logger';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import { useSetupProgress } from './hooks/useSetupProgress';
import { SETUP_STEPS, PHASE_INFO, SetupPhase, EventCategory } from './types';
import { ALBUM_PRESETS } from '../wizard/presets/albumPresets';

import SetupProgress from './SetupProgress';
import SetupChecklist from './SetupChecklist';
import MilestoneModal from './MilestoneModal';

import EventTypeStep from './steps/EventTypeStep';
import TitleStep from './steps/TitleStep';
import DateLocationStep from './steps/DateLocationStep';
import CoverImageStep from './steps/CoverImageStep';
import ProfileImageStep from './steps/ProfileImageStep';
import ColorSchemeStep from './steps/ColorSchemeStep';
import QRCodeStep from './steps/QRCodeStep';
import ShareStep from './steps/ShareStep';
import AlbumsStep from './steps/AlbumsStep';
import ChallengesStep from './steps/ChallengesStep';
import GuestbookStep from './steps/GuestbookStep';

export default function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const isNewEvent = searchParams.get('new') === 'true';
  
  const {
    state,
    updateState,
    completeStep,
    goToStep,
    goToPhase,
    resetProgress,
    clearSavedProgress,
    currentStep,
    overallProgress,
    isPhaseComplete,
    getStepStatus,
  } = useSetupProgress();

  // Reset state when explicitly creating a NEW event (?new=true from dashboard)
  useEffect(() => {
    if (isNewEvent && typeof window !== 'undefined') {
      localStorage.removeItem('gaestefotos_setup_progress');
      resetProgress();
    }
  }, [isNewEvent, resetProgress]);

  const [showMilestone, setShowMilestone] = useState(false);
  const [milestonePhase, setMilestonePhase] = useState<SetupPhase>(1);
  const [showChecklist, setShowChecklist] = useState(false);
  const [eventLimitReached, setEventLimitReached] = useState(false);
  const [eventLimitInfo, setEventLimitInfo] = useState<{ limit: number; current: number } | null>(null);

  // Check event limit on mount
  useEffect(() => {
    const checkEventLimit = async () => {
      try {
        const res = await fetch('/api/events/check-limit');
        if (res.ok) {
          const data = await res.json();
          if (data.limitReached) {
            setEventLimitReached(true);
            setEventLimitInfo({ limit: data.limit, current: data.current });
          }
        }
      } catch (e) {
        // Ignore - will be caught on event creation
      }
    };
    checkEventLimit();
  }, []);

  // Handle Enter key to proceed to next step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on Enter if not in a textarea or contenteditable
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isTextArea = tagName === 'textarea';
        const isContentEditable = target.isContentEditable;
        const isInput = tagName === 'input';
        
        // Allow Enter in textareas and contenteditable, but trigger next on regular inputs
        if (!isTextArea && !isContentEditable && !showMilestone && !state.isCreating) {
          // Find and click the "Weiter" button
          const weiterButton = document.querySelector('button:not([disabled])');
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent?.includes('Weiter') && !btn.disabled) {
              e.preventDefault();
              btn.click();
              break;
            }
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMilestone, state.isCreating]);

  // Handle event type change with album presets
  const handleEventTypeChange = useCallback((eventType: EventCategory) => {
    updateState({ eventType });
    const albums = ALBUM_PRESETS[eventType]?.map((preset) => ({
      id: preset.id,
      name: preset.label,
      icon: preset.icon,
      enabled: preset.default,
    })) || [];
    updateState({ albums });
  }, [updateState]);

  // Upload design (cover image, profile image, color scheme) after Phase 2
  const uploadDesign = async () => {
    if (!state.eventId) return;
    
    try {
      // Upload cover image if exists
      if (state.coverImage) {
        const formData = new FormData();
        formData.append('file', state.coverImage);
        
        await fetch(`/api/events/${state.eventId}/design/cover`, {
          method: 'POST',
          body: formData,
        });
      } else if (state.coverImagePreview && state.coverImagePreview.startsWith('http')) {
        // Sample image URL selected - save to designConfig
        await fetch(`/api/events/${state.eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designConfig: { coverImage: state.coverImagePreview }
          }),
        });
      }
      
      // Upload profile image if exists
      if (state.profileImage) {
        const formData = new FormData();
        formData.append('file', state.profileImage);
        
        await fetch(`/api/events/${state.eventId}/design/profile`, {
          method: 'POST',
          body: formData,
        });
      }
      
      // Update color scheme
      if (state.colorScheme) {
        await fetch(`/api/events/${state.eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designConfig: { colorScheme: state.colorScheme }
          }),
        });
      }
    } catch (error) {
      logger.error('Error uploading design:', error);
    }
  };

  // Complete step and check for milestone
  const handleCompleteStep = useCallback((stepId: string) => {
    completeStep(stepId);
    
    // Check if phase is complete
    const step = SETUP_STEPS.find(s => s.id === stepId);
    if (step) {
      const phaseSteps = SETUP_STEPS.filter(s => s.phase === step.phase);
      const lastStepInPhase = phaseSteps[phaseSteps.length - 1];
      
      if (stepId === lastStepInPhase.id) {
        // Phase complete - show milestone
        setMilestonePhase(step.phase);
        
        // For Phase 1, create the event first
        if (step.phase === 1) {
          createEvent();
        } else if (step.phase === 2) {
          // For Phase 2, upload design (cover image, color scheme)
          uploadDesign();
          setShowMilestone(true);
        } else {
          setShowMilestone(true);
        }
      }
    }
  }, [completeStep, state.eventId, state.coverImage, state.coverImagePreview, state.colorScheme]);

  // Create event (Phase 1 completion)
  const createEvent = async () => {
    updateState({ isCreating: true, error: null });
    
    try {
      const formData = new FormData();
      formData.append('title', state.title);
      
      if (state.dateTime) {
        formData.append('dateTime', state.dateTime.toISOString());
      }
      if (state.location) {
        formData.append('location', state.location);
      }
      
      // Default settings
      formData.append('visibilityMode', 'public');
      formData.append('colorScheme', 'elegant');
      
      // Albums
      const enabledAlbums = state.albums.filter(a => a.enabled);
      if (enabledAlbums.length > 0) {
        formData.append('albums', JSON.stringify(enabledAlbums));
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Event konnte nicht erstellt werden');
      }

      const result = await response.json();
      const eventId = result.id || result.event?.id;
      const eventSlug = result.slug || result.event?.slug;

      updateState({ 
        eventId, 
        eventSlug,
        isCreating: false 
      });
      
      clearSavedProgress();
      setShowMilestone(true);
    } catch (error) {
      logger.error('Error creating event:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        isCreating: false 
      });
    }
  };

  // Milestone handlers
  const handleMilestoneContinue = () => {
    setShowMilestone(false);
    if (milestonePhase < 4) {
      goToPhase((milestonePhase + 1) as SetupPhase);
    } else {
      // All done - go to dashboard
      if (state.eventId) {
        router.push(`/events/${state.eventId}/dashboard?created=true`);
      }
    }
  };

  const handleViewEvent = () => {
    if (state.eventSlug) {
      window.open(`/e3/${state.eventSlug}`, '_blank');
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (state.currentStepId) {
      case 'event-type':
        return (
          <EventTypeStep
            selectedType={state.eventType}
            selectedSubtype={state.eventSubtype}
            onSelectType={handleEventTypeChange}
            onSelectSubtype={(subtype) => updateState({ eventSubtype: subtype })}
            onNext={() => handleCompleteStep('event-type')}
          />
        );
      
      case 'title':
        return (
          <TitleStep
            title={state.title}
            eventType={state.eventType}
            onTitleChange={(title) => updateState({ title })}
            onNext={() => handleCompleteStep('title')}
            onBack={() => goToStep('event-type')}
          />
        );
      
      case 'date-location':
        return (
          <DateLocationStep
            dateTime={state.dateTime}
            location={state.location}
            onDateTimeChange={(dateTime) => updateState({ dateTime })}
            onLocationChange={(location) => updateState({ location })}
            onNext={() => handleCompleteStep('date-location')}
            onBack={() => goToStep('title')}
            onSkip={() => handleCompleteStep('date-location')}
          />
        );
      
      // Phase 2: Design
      case 'cover-image':
        return (
          <CoverImageStep
            coverImage={state.coverImage}
            coverImagePreview={state.coverImagePreview}
            onCoverImageChange={(file, preview) => updateState({ coverImage: file, coverImagePreview: preview })}
            onNext={() => handleCompleteStep('cover-image')}
            onBack={() => goToStep('date-location')}
            onSkip={() => handleCompleteStep('cover-image')}
          />
        );
      
      case 'profile-image':
        return (
          <ProfileImageStep
            profileImage={state.profileImage}
            profileImagePreview={state.profileImagePreview}
            onProfileImageChange={(file, preview) => updateState({ profileImage: file, profileImagePreview: preview })}
            onNext={() => handleCompleteStep('profile-image')}
            onBack={() => goToStep('cover-image')}
            onSkip={() => handleCompleteStep('profile-image')}
          />
        );
      
      case 'color-scheme':
        return (
          <ColorSchemeStep
            colorScheme={state.colorScheme}
            coverImagePreview={state.coverImagePreview}
            onColorSchemeChange={(colorScheme) => updateState({ colorScheme })}
            onNext={() => handleCompleteStep('color-scheme')}
            onBack={() => goToStep('profile-image')}
          />
        );
      
      // Phase 3: QR & Teilen
      case 'qr-code':
        return (
          <QRCodeStep
            eventId={state.eventId}
            eventSlug={state.eventSlug}
            eventType={state.eventType}
            eventTitle={state.title}
            onNext={() => handleCompleteStep('qr-code')}
            onBack={() => goToStep('color-scheme')}
            onSkip={() => handleCompleteStep('qr-code')}
          />
        );
      
      case 'share':
        return (
          <ShareStep
            eventSlug={state.eventSlug}
            eventTitle={state.title}
            onNext={() => handleCompleteStep('share')}
            onBack={() => goToStep('qr-code')}
          />
        );
      
      // Phase 4: Erweiterte Features
      case 'albums':
        return (
          <AlbumsStep
            albums={state.albums}
            eventType={state.eventType}
            eventTitle={state.title}
            onAlbumsChange={(albums) => updateState({ albums })}
            onNext={() => handleCompleteStep('albums')}
            onBack={() => goToStep('share')}
            onSkip={() => handleCompleteStep('albums')}
          />
        );
      
      case 'challenges':
        return (
          <ChallengesStep
            challenges={state.challenges}
            eventType={state.eventType}
            onChallengesChange={(challenges) => updateState({ challenges })}
            onNext={() => handleCompleteStep('challenges')}
            onBack={() => goToStep('albums')}
            onSkip={() => handleCompleteStep('challenges')}
          />
        );
      
      case 'guestbook':
        return (
          <GuestbookStep
            enabled={state.guestbookEnabled}
            message={state.guestbookMessage}
            eventType={state.eventType}
            eventTitle={state.title}
            onEnabledChange={(enabled) => updateState({ guestbookEnabled: enabled })}
            onMessageChange={(message) => updateState({ guestbookMessage: message })}
            onNext={() => handleCompleteStep('guestbook')}
            onBack={() => goToStep('challenges')}
            onSkip={() => handleCompleteStep('guestbook')}
          />
        );
      
      // Co-hosts step (simplified for now)
      case 'cohosts':
        return (
          <div className="space-y-6 text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900">Co-Hosts einladen 👥</h2>
            <p className="text-gray-500">Diese Funktion wird bald verfügbar sein.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => goToStep('guestbook')} variant="ghost">
                Zurück
              </Button>
              <Button
                onClick={() => handleCompleteStep('cohosts')}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              >
                Fertig
              </Button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Schritt wird implementiert...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Abbrechen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h1 className="font-semibold text-gray-900">Neues Event</h1>
          <button
            onClick={() => setShowChecklist(!showChecklist)}
            className="text-sm text-amber-600 font-medium"
          >
            {showChecklist ? 'Schließen' : 'Alle Schritte'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Event Limit Warning - shown at the top */}
        {eventLimitReached && eventLimitInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <p className="text-sm text-amber-800 font-medium">
              Du hast das Limit von {eventLimitInfo.limit} kostenlosen Events erreicht.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Bitte upgrade dein Paket, um weitere Events zu erstellen.
            </p>
            <a
              href="https://gästefotos.com/preise"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-medium text-amber-600 hover:text-amber-800"
            >
              Pakete ansehen →
            </a>
          </motion.div>
        )}

        {/* Progress Header */}
        <SetupProgress
          currentPhase={state.currentPhase}
          overallProgress={overallProgress}
          currentStepTitle={currentStep?.title || ''}
        />

        {/* Checklist (collapsible) */}
        <AnimatePresence>
          {showChecklist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <SetupChecklist
                completedSteps={state.completedSteps}
                currentStepId={state.currentStepId}
                currentPhase={state.currentPhase}
                onStepClick={goToStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {state.isCreating ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-gray-600 font-medium">Event wird erstellt...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentStepId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p className="text-sm text-red-700">{state.error}</p>
          </motion.div>
        )}
      </div>

      {/* Milestone Modal */}
      <MilestoneModal
        isOpen={showMilestone}
        phase={milestonePhase}
        eventTitle={state.title}
        eventSlug={state.eventSlug}
        onContinue={handleMilestoneContinue}
        onViewEvent={handleViewEvent}
      />
    </div>
  );
}
