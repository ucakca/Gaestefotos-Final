'use client';

import { useState, useCallback, useEffect } from 'react';
import { SetupState, INITIAL_SETUP_STATE, SETUP_STEPS, SetupStep, SetupPhase } from '../types';
import logger from '@/lib/logger';

const STORAGE_KEY = 'gaestefotos_setup_progress';

export function useSetupProgress() {
  const [state, setState] = useState<SetupState>(INITIAL_SETUP_STATE);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert dateTime string back to Date
          if (parsed.dateTime) {
            parsed.dateTime = new Date(parsed.dateTime);
          }
          setState(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          logger.error('Failed to load setup progress:', e);
        }
      }
    }
  }, []);

  // Save to localStorage on state change (with quota protection)
  useEffect(() => {
    if (typeof window !== 'undefined' && (state.title || state.completedSteps.length > 0)) {
      try {
        // Save all serializable fields — exclude File objects only
        const toSave = {
          eventId: state.eventId,
          eventSlug: state.eventSlug,
          title: state.title,
          eventType: state.eventType,
          eventSubtype: state.eventSubtype,
          dateTime: state.dateTime,
          location: state.location,
          currentStepId: state.currentStepId,
          currentPhase: state.currentPhase,
          completedSteps: state.completedSteps,
          // Phase 2: Design (previews only, not File objects)
          coverImagePreview: state.coverImagePreview,
          profileImagePreview: state.profileImagePreview,
          colorScheme: state.colorScheme,
          // Phase 3: Galerie einrichten
          albums: state.albums,
          challenges: state.challenges,
          guestbookEnabled: state.guestbookEnabled,
          guestbookMessage: state.guestbookMessage,
          featuresConfig: state.featuresConfig,
          // Phase 4: Team
          coHostEmails: state.coHostEmails,
          // Phase 5: QR & Teilen
          qrStyle: state.qrStyle,
          invitationText: state.invitationText,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        // QuotaExceededError - clear and continue without persistence
        logger.warn('localStorage quota exceeded, clearing setup progress');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [state]);

  const updateState = useCallback((updates: Partial<SetupState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setState(prev => {
      const newCompletedSteps = prev.completedSteps.includes(stepId)
        ? prev.completedSteps
        : [...prev.completedSteps, stepId];
      
      // Find next step
      const currentIndex = SETUP_STEPS.findIndex(s => s.id === stepId);
      const nextStep = SETUP_STEPS[currentIndex + 1];
      
      return {
        ...prev,
        completedSteps: newCompletedSteps,
        currentStepId: nextStep?.id || stepId,
        currentPhase: nextStep?.phase || prev.currentPhase,
      };
    });
  }, []);

  const goToStep = useCallback((stepId: string) => {
    const step = SETUP_STEPS.find(s => s.id === stepId);
    if (step) {
      setState(prev => ({
        ...prev,
        currentStepId: stepId,
        currentPhase: step.phase,
      }));
    }
  }, []);

  const goToPhase = useCallback((phase: SetupPhase) => {
    const firstStepInPhase = SETUP_STEPS.find(s => s.phase === phase);
    if (firstStepInPhase) {
      setState(prev => ({
        ...prev,
        currentPhase: phase,
        currentStepId: firstStepInPhase.id,
      }));
    }
  }, []);

  const resetProgress = useCallback(() => {
    setState(INITIAL_SETUP_STATE);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearSavedProgress = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Computed values
  const currentStep = SETUP_STEPS.find(s => s.id === state.currentStepId);
  const stepsInCurrentPhase = SETUP_STEPS.filter(s => s.phase === state.currentPhase);
  const completedInPhase = stepsInCurrentPhase.filter(s => state.completedSteps.includes(s.id)).length;
  const totalSteps = SETUP_STEPS.length;
  const completedSteps = state.completedSteps.length;
  const overallProgress = Math.round((completedSteps / totalSteps) * 100);
  const phaseProgress = Math.round((completedInPhase / stepsInCurrentPhase.length) * 100);

  const isPhaseComplete = (phase: SetupPhase) => {
    const phaseSteps = SETUP_STEPS.filter(s => s.phase === phase);
    const requiredSteps = phaseSteps.filter(s => s.isRequired);
    return requiredSteps.every(s => state.completedSteps.includes(s.id));
  };

  const getStepStatus = (stepId: string): 'pending' | 'active' | 'completed' => {
    if (state.completedSteps.includes(stepId)) return 'completed';
    if (state.currentStepId === stepId) return 'active';
    return 'pending';
  };

  return {
    state,
    updateState,
    completeStep,
    goToStep,
    goToPhase,
    resetProgress,
    clearSavedProgress,
    currentStep,
    stepsInCurrentPhase,
    totalSteps,
    completedSteps,
    overallProgress,
    phaseProgress,
    isPhaseComplete,
    getStepStatus,
  };
}
