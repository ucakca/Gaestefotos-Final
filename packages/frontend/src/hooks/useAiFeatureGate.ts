'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';

/**
 * useAiFeatureGate — Single Source of Truth for guest-facing AI features.
 * 
 * Loads the full AI Feature Registry + gate status from the backend.
 * The backend populates UI metadata (emoji, gradient, endpoint, inputFlow, etc.)
 * so the frontend needs ZERO hardcoded feature lists.
 * 
 * Adding a new AI feature to the backend registry automatically makes it
 * appear in the correct guest modal (games or effects).
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
  // UI metadata from backend registry
  emoji?: string;
  gradient?: string;
  guestDescription?: string;
  endpoint?: string;
  uiGroup?: string;
  inputFlow?: string;
  energyCostCategory?: string;
  sortOrder?: number;
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

  // ─── Dynamic Feature Lists (replaces hardcoded GAMES[] / EFFECTS[]) ───

  // All allowed games with UI metadata, sorted by sortOrder
  const games = useMemo(() => {
    if (!gate) return [];
    return gate.features
      .filter(f => f.allowed && f.uiGroup === 'game' && f.emoji && f.endpoint)
      .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
  }, [gate]);

  // All allowed effects with UI metadata, sorted by sortOrder
  const effects = useMemo(() => {
    if (!gate) return [];
    return gate.features
      .filter(f => f.allowed && f.uiGroup === 'effect' && f.emoji && f.endpoint)
      .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
  }, [gate]);

  return {
    gate,
    loading,
    isAllowed,
    getBlockReason,
    allowedFeatures: gate?.allowedFeatures || [],
    games,
    effects,
    refresh: fetchGate,
  };
}
