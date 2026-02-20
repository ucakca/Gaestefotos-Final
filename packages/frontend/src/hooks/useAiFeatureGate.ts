'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

/**
 * useAiFeatureGate — Loads allowed AI features for an event from the backend.
 * Used by AiGamesModal and AiEffectsModal to filter out disabled/unavailable features.
 * 
 * The backend /ai-features endpoint is PUBLIC (no auth required).
 */

export interface AiFeatureAccess {
  key: string;
  label: string;
  description: string;
  allowed: boolean;
  reason?: 'package' | 'event_config' | 'device' | 'disabled';
  creditCost: number;
  category: string;
  packageCategory: string;
}

export interface AiFeatureGateResult {
  features: AiFeatureAccess[];
  allowedFeatures: string[];
  limits: {
    maxAiCreditsPerEvent: number | null;
    maxAiPlaysPerGuest: number | null;
  };
  deviceType: string;
}

// Simple in-memory cache per eventId
const cache: Record<string, { data: AiFeatureGateResult; ts: number }> = {};
const CACHE_TTL = 60_000; // 1 minute

export function useAiFeatureGate(eventId: string | null) {
  const [gate, setGate] = useState<AiFeatureGateResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGate = useCallback(async () => {
    if (!eventId) return;

    // Check cache
    const cached = cache[eventId];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setGate(cached.data);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get<AiFeatureGateResult>(`/events/${eventId}/ai-features`);
      cache[eventId] = { data, ts: Date.now() };
      setGate(data);
    } catch {
      // Fail-open: if gate endpoint fails, allow everything
      setGate(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGate();
  }, [fetchGate]);

  // Check if a specific feature is allowed
  const isAllowed = useCallback((featureKey: string): boolean => {
    if (!gate) return true; // fail-open
    return gate.allowedFeatures.includes(featureKey);
  }, [gate]);

  // Get the reason why a feature is blocked
  const getBlockReason = useCallback((featureKey: string): string | undefined => {
    if (!gate) return undefined;
    const feat = gate.features.find(f => f.key === featureKey);
    return feat?.reason;
  }, [gate]);

  return {
    gate,
    loading,
    isAllowed,
    getBlockReason,
    allowedFeatures: gate?.allowedFeatures || [],
    refresh: fetchGate,
  };
}
