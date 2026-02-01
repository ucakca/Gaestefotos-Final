import logger from '@/lib/logger';
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardState, INITIAL_WIZARD_STATE, AlbumConfig, ChallengeConfig } from './types';
import { EVENT_TYPES } from './presets/eventTypes';
import { ALBUM_PRESETS } from './presets/albumPresets';
import { CHALLENGE_PRESETS } from './presets/challengePresets';

import EventTypeStep from './steps/EventTypeStep';
import BasicInfoStep from './steps/BasicInfoStep';
import DesignStep from './steps/DesignStep';
import AlbumsStep from './steps/AlbumsStep';
import AccessStep from './steps/AccessStep';
import ChallengesStep from './steps/ChallengesStep';
import GuestbookStep from './steps/GuestbookStep';
import CoHostsStep from './steps/CoHostsStep';
import SummaryStep from './steps/SummaryStep';

export default function EventWizard() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleEventTypeChange = (eventType: WizardState['eventType']) => {
    updateState({ eventType });
    const albums = ALBUM_PRESETS[eventType].map((preset) => ({
      ...preset,
      enabled: preset.default,
    }));
    updateState({ albums });

    const challenges = CHALLENGE_PRESETS[eventType].map((preset) => ({
      ...preset,
      enabled: preset.default,
    }));
    updateState({ challenges });
  };

  const handleNext = () => {
    if (state.isExtendedMode) {
      if (state.currentStep < 9) {
        updateState({ currentStep: state.currentStep + 1 });
      }
    } else {
      if (state.currentStep < 5) {
        updateState({ currentStep: state.currentStep + 1 });
      }
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 });
    }
  };

  const handleQuickFinish = async () => {
    await createEvent();
  };

  const handleExtendedMode = () => {
    updateState({ isExtendedMode: true, currentStep: 6 });
  };

  const handleSkipToSummary = () => {
    updateState({ currentStep: 9 });
  };

  const createEvent = async () => {
    setIsCreating(true);
    setError(null);
    setUploadProgress('Event wird erstellt...');
    
    try {
      const formData = new FormData();

      if (!state.title.trim()) {
        throw new Error('Bitte gib einen Event-Namen ein');
      }

      formData.append('title', state.title);
      if (state.dateTime) {
        formData.append('dateTime', state.dateTime.toISOString());
      }
      if (state.location) {
        formData.append('location', state.location);
      }
      formData.append('password', state.password);
      formData.append('visibilityMode', state.visibilityMode);
      formData.append('colorScheme', state.colorScheme);

      if (state.coverImage) {
        setUploadProgress('Cover-Bild wird hochgeladen...');
        formData.append('coverImage', state.coverImage);
      }
      if (state.profileImage) {
        setUploadProgress('Profil-Bild wird hochgeladen...');
        formData.append('profileImage', state.profileImage);
      }

      const enabledAlbums = state.albums.filter((a) => a.enabled);
      if (enabledAlbums.length === 0) {
        throw new Error('Bitte wähle mindestens ein Album aus');
      }
      formData.append('albums', JSON.stringify(enabledAlbums));

      if (state.isExtendedMode) {
        const enabledChallenges = state.challenges.filter((c) => c.enabled);
        formData.append('challenges', JSON.stringify(enabledChallenges));

        formData.append(
          'guestbook',
          JSON.stringify({
            enabled: state.guestbookEnabled,
            message: state.guestbookMessage,
            allowVoice: state.allowVoiceMessages,
          })
        );

        if (state.coHostEmails.length > 0) {
          formData.append('coHostEmails', JSON.stringify(state.coHostEmails));
        }
      }

      setUploadProgress('Daten werden gesendet...');
      const response = await fetch('/api/events', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || errorData?.message || `Fehler ${response.status}: Event konnte nicht erstellt werden`;
        throw new Error(errorMessage);
      }

      setUploadProgress('Event erfolgreich erstellt!');
      const result = await response.json();
      const eventId = result.id || result.event?.id;
      if (!eventId) {
        throw new Error('Event wurde erstellt, aber keine ID erhalten');
      }
      router.push(`/events/${eventId}/dashboard?created=true`);
    } catch (error) {
      logger.error('Error creating event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
      setError(errorMessage);
      setIsCreating(false);
      setUploadProgress('');
    }
  };

  const getTotalSteps = () => (state.isExtendedMode ? 9 : 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/events')}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Abbrechen"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold">Event erstellen</h1>
            </div>
            <span className="text-sm font-medium text-app-fg">
              Schritt {state.currentStep} von {getTotalSteps()}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-app-accent transition-all duration-300 rounded-full"
              style={{ width: `${(state.currentStep / getTotalSteps()) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-app-muted">
            {Math.round((state.currentStep / getTotalSteps()) * 100)}% abgeschlossen
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          {state.currentStep === 1 && (
            <EventTypeStep
              selectedType={state.eventType}
              selectedSubtype={state.eventSubtype}
              onSelectType={handleEventTypeChange}
              onSelectSubtype={(subtype) => updateState({ eventSubtype: subtype })}
              onNext={handleNext}
            />
          )}

          {state.currentStep === 2 && (
            <BasicInfoStep
              title={state.title}
              dateTime={state.dateTime}
              location={state.location}
              onTitleChange={(title) => updateState({ title })}
              onDateTimeChange={(dateTime) => updateState({ dateTime })}
              onLocationChange={(location) => updateState({ location })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 3 && (
            <DesignStep
              title={state.title}
              coverImage={state.coverImage}
              coverImagePreview={state.coverImagePreview}
              profileImage={state.profileImage}
              profileImagePreview={state.profileImagePreview}
              colorScheme={state.colorScheme}
              onCoverImageChange={(file, preview) => updateState({ coverImage: file, coverImagePreview: preview })}
              onProfileImageChange={(file, preview) => updateState({ profileImage: file, profileImagePreview: preview })}
              onColorSchemeChange={(colorScheme) => updateState({ colorScheme })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 4 && (
            <AlbumsStep
              albums={state.albums}
              onAlbumsChange={(albums) => updateState({ albums })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 5 && (
            <AccessStep
              password={state.password}
              visibilityMode={state.visibilityMode}
              onPasswordChange={(password) => updateState({ password })}
              onVisibilityModeChange={(visibilityMode) => updateState({ visibilityMode })}
              onQuickFinish={handleQuickFinish}
              onExtendedMode={handleExtendedMode}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 6 && (
            <ChallengesStep
              challenges={state.challenges}
              onChallengesChange={(challenges) => updateState({ challenges })}
              onNext={handleNext}
              onSkip={handleSkipToSummary}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 7 && (
            <GuestbookStep
              enabled={state.guestbookEnabled}
              message={state.guestbookMessage}
              allowVoiceMessages={state.allowVoiceMessages}
              onEnabledChange={(enabled) => updateState({ guestbookEnabled: enabled })}
              onMessageChange={(message) => updateState({ guestbookMessage: message })}
              onAllowVoiceMessagesChange={(allow) => updateState({ allowVoiceMessages: allow })}
              onNext={handleNext}
              onSkip={handleSkipToSummary}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 8 && (
            <CoHostsStep
              emails={state.coHostEmails}
              onEmailsChange={(emails) => updateState({ coHostEmails: emails })}
              onNext={handleNext}
              onSkip={handleSkipToSummary}
              onBack={handleBack}
            />
          )}

          {state.currentStep === 9 && (
            <SummaryStep
              state={state}
              onBack={handleBack}
              onFinish={createEvent}
              onEditStep={(step) => updateState({ currentStep: step })}
              isCreating={isCreating}
            />
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">Fehler beim Erstellen</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress Display */}
        {uploadProgress && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-blue-700 font-medium">{uploadProgress}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
