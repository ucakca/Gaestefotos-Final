'use client';

import logger from '@/lib/logger';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import api from '@/lib/api';
import { useSetupProgress } from './hooks/useSetupProgress';
import { SETUP_STEPS, PHASE_INFO, SetupPhase, EventCategory, FeaturesConfig } from './types';
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
import FeaturesStep from './steps/FeaturesStep';
import CoHostsStep from './steps/CoHostsStep';

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

  // Resume flow: load existing event data when ?eventId=xxx is in URL
  useEffect(() => {
    if (!eventId || isNewEvent || state.eventId === eventId) return;
    
    const loadEvent = async () => {
      try {
        const { data } = await api.get(`/events/${eventId}`);
        if (!data) return;
        
        const designConfig = (data.designConfig as any) || {};
        const featuresConfig = (data.featuresConfig as any) || {};
        
        // Determine completed steps based on event data
        const completedSteps: string[] = [];
        // Phase 1 is always done if event exists
        completedSteps.push('event-type', 'title', 'date-location');
        
        if (designConfig.coverImage || data.coverImageUrl) completedSteps.push('cover-image');
        if (designConfig.profileImage || data.profileImageUrl) completedSteps.push('profile-image');
        if (designConfig.colorScheme) completedSteps.push('color-scheme');
        
        // Find first incomplete step to resume from
        const allStepIds = SETUP_STEPS.map(s => s.id);
        const firstIncomplete = allStepIds.find(id => !completedSteps.includes(id));
        const resumeStep = SETUP_STEPS.find(s => s.id === firstIncomplete) || SETUP_STEPS[3]; // Default to cover-image
        
        // Pre-populate state
        updateState({
          eventId: data.id,
          eventSlug: data.slug,
          title: data.title || '',
          dateTime: data.dateTime ? new Date(data.dateTime) : null,
          location: data.location || '',
          colorScheme: designConfig.colorScheme || 'elegant',
          coverImagePreview: designConfig.coverImage || data.coverImageUrl || null,
          profileImagePreview: designConfig.profileImage || data.profileImageUrl || null,
          featuresConfig: {
            allowUploads: featuresConfig.allowUploads ?? true,
            allowDownloads: featuresConfig.allowDownloads ?? true,
            moderationRequired: featuresConfig.moderationRequired ?? false,
            mysteryMode: featuresConfig.mysteryMode ?? false,
            showGuestlist: featuresConfig.showGuestlist ?? false,
          },
          completedSteps,
          currentStepId: resumeStep.id,
          currentPhase: resumeStep.phase,
          isCreating: false,
          error: null,
        });
      } catch (err) {
        logger.error('Failed to load event for wizard resume:', err);
      }
    };
    
    loadEvent();
  }, [eventId, isNewEvent]);

  const [showMilestone, setShowMilestone] = useState(false);
  const [milestonePhase, setMilestonePhase] = useState<SetupPhase>(1);
  const [showChecklist, setShowChecklist] = useState(false);
  const [eventLimitReached, setEventLimitReached] = useState(false);
  const [eventLimitInfo, setEventLimitInfo] = useState<{ limit: number; current: number } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetWizard = () => {
    if (state.eventId) {
      // Event already created — show confirmation first
      setShowResetConfirm(true);
    } else {
      // No event yet — reset immediately
      resetProgress();
    }
  };

  const confirmReset = () => {
    setShowResetConfirm(false);
    resetProgress();
  };

  // Check event limit on mount (skip when resuming an existing event)
  useEffect(() => {
    if (eventId) return; // Resuming existing event — no limit check needed
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
  }, [eventId]);

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

  // Sync step data to backend after event creation
  const syncToBackend = async (phase: SetupPhase) => {
    if (!state.eventId) return;
    
    try {
      if (phase === 2) {
        // Upload cover image
        if (state.coverImage) {
          const formData = new FormData();
          formData.append('file', state.coverImage);
          await api.post(`/events/${state.eventId}/design/cover`, formData);
        } else if (state.coverImagePreview && state.coverImagePreview.startsWith('http')) {
          await api.patch(`/events/${state.eventId}`, {
            designConfig: { coverImage: state.coverImagePreview }
          });
        }
        
        // Upload profile image
        if (state.profileImage) {
          const formData = new FormData();
          formData.append('file', state.profileImage);
          await api.post(`/events/${state.eventId}/design/profile`, formData);
        }
        
        // Update color scheme
        if (state.colorScheme) {
          await api.patch(`/events/${state.eventId}`, {
            designConfig: { colorScheme: state.colorScheme }
          });
        }
      } else if (phase === 3) {
        // Sync galerie settings: albums, guestbook, challenges, features
        await api.put(`/events/${state.eventId}`, {
          featuresConfig: state.featuresConfig,
        });
      }
      // Phase 4 (Co-Hosts) is handled directly in CoHostsStep via API
      // Phase 5 (QR & Share) doesn't need backend sync
    } catch (error) {
      logger.error('Error syncing to backend:', error);
    }
  };

  // Complete step and check for milestone
  const handleCompleteStep = useCallback((stepId: string, skipMilestone?: boolean) => {
    // Check if phase is complete
    const step = SETUP_STEPS.find(s => s.id === stepId);
    const phaseSteps = step ? SETUP_STEPS.filter(s => s.phase === step.phase) : [];
    const lastStepInPhase = phaseSteps[phaseSteps.length - 1];
    const isPhaseEnd = step && stepId === lastStepInPhase?.id;
    
    if (isPhaseEnd && step.phase === 1) {
      // Phase 1: Don't advance yet — createEvent handles completion on success
      setMilestonePhase(1);
      createEvent(stepId);
      return;
    }
    
    // For all other steps, advance normally
    completeStep(stepId);
    
    if (isPhaseEnd && step) {
      if (skipMilestone) {
        // Skip milestone (e.g. co-hosts step without inviting anyone)
        syncToBackend(step.phase);
        goToPhase((step.phase + 1) as SetupPhase);
      } else {
        // Show milestone
        setMilestonePhase(step.phase);
        syncToBackend(step.phase);
        setShowMilestone(true);
      }
    }
  }, [completeStep, state]);

  // Create event (Phase 1 completion)
  // Only advances wizard on success; stays at current step on failure
  const createEvent = async (lastPhaseStepId: string) => {
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
      
      // NOW advance the wizard — event was created successfully
      completeStep(lastPhaseStepId);
      clearSavedProgress();
      setShowMilestone(true);
    } catch (error) {
      logger.error('Error creating event:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        isCreating: false 
      });
      // Stay at current step — don't advance
    }
  };

  // Milestone handlers
  const handleMilestoneContinue = () => {
    setShowMilestone(false);
    if (milestonePhase < 5) {
      goToPhase((milestonePhase + 1) as SetupPhase);
    } else {
      // All done - go to dashboard
      clearSavedProgress();
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
      
      // Phase 3: Einrichten
      case 'albums':
        return (
          <AlbumsStep
            albums={state.albums}
            eventType={state.eventType}
            eventTitle={state.title}
            onAlbumsChange={(albums) => updateState({ albums })}
            onNext={() => handleCompleteStep('albums')}
            onBack={() => goToStep('color-scheme')}
            onSkip={() => handleCompleteStep('albums')}
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
            onBack={() => goToStep('albums')}
            onSkip={() => handleCompleteStep('guestbook')}
          />
        );
      
      case 'challenges':
        return (
          <ChallengesStep
            challenges={state.challenges}
            eventType={state.eventType}
            onChallengesChange={(challenges) => updateState({ challenges })}
            onNext={() => handleCompleteStep('challenges')}
            onBack={() => goToStep('guestbook')}
            onSkip={() => handleCompleteStep('challenges')}
          />
        );
      
      case 'features':
        return (
          <FeaturesStep
            featuresConfig={state.featuresConfig}
            onFeaturesChange={(featuresConfig: FeaturesConfig) => updateState({ featuresConfig })}
            eventType={state.eventType}
            onNext={() => handleCompleteStep('features')}
            onBack={() => goToStep('challenges')}
            onSkip={() => handleCompleteStep('features')}
          />
        );
      
      // Phase 4: Team
      case 'cohosts':
        return (
          <CoHostsStep
            eventId={state.eventId}
            onNext={(hasInvited: boolean) => handleCompleteStep('cohosts', !hasInvited)}
            onBack={() => goToStep('features')}
            onSkip={() => handleCompleteStep('cohosts', true)}
          />
        );
      
      // Phase 5: Teilen
      case 'qr-code':
        return (
          <QRCodeStep
            eventId={state.eventId}
            eventSlug={state.eventSlug}
            eventType={state.eventType}
            eventTitle={state.title}
            onNext={() => handleCompleteStep('qr-code')}
            onBack={() => goToStep('cohosts')}
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
      
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Schritt wird implementiert...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 -ml-2 rounded-lg hover:bg-background transition-colors"
            title="Abbrechen"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="font-semibold text-foreground">Neues Event</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWizard}
              className="p-2 rounded-lg hover:bg-background transition-colors"
              title="Wizard neu starten"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="text-sm text-amber-600 font-medium"
            >
              {showChecklist ? 'Schließen' : 'Alle Schritte'}
            </button>
          </div>
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
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          {state.isCreating ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-muted-foreground font-medium">Event wird erstellt...</p>
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
            <p className="text-sm text-red-700 font-medium">{state.error}</p>
            {state.error.includes('Limit') && (
              <a
                href="https://gästefotos.com/pakete"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm font-medium text-red-600 hover:text-red-800 underline"
              >
                Pakete ansehen →
              </a>
            )}
          </motion.div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Wizard neu starten?</h3>
                <p className="text-sm text-muted-foreground">
                  Dein Event <strong>"{state.title}"</strong> bleibt erhalten.
                  Nur der Wizard-Fortschritt wird zurückgesetzt.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={confirmReset}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Neu starten
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
