/**
 * Hook to fetch AI usage statistics and recommended energy costs
 */
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface FeatureUsageStats {
  feature: string;
  totalCalls: number;
  successfulCalls: number;
  successRate: string;
  avgCostCents: number;
  avgCostUsd: number;
  totalCostUsd: number;
  avgDurationMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  recommendedEnergy: number;
}

export interface AiUsageStats {
  period: string;
  features: FeatureUsageStats[];
  totals: {
    totalCalls: number;
    totalCostUsd: number;
  };
}

let cachedStats: AiUsageStats | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useAiUsageStats() {
  const [stats, setStats] = useState<AiUsageStats | null>(cachedStats);
  const [loading, setLoading] = useState(!cachedStats);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (force = false) => {
    // Use cache if valid
    if (!force && cachedStats && Date.now() - cacheTime < CACHE_TTL) {
      setStats(cachedStats);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<AiUsageStats>('/admin/ai-providers/usage-stats');
      cachedStats = res.data;
      cacheTime = Date.now();
      setStats(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage stats');
      // Don't clear existing stats on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Helper to get recommended energy for a feature
  const getRecommendedEnergy = useCallback((feature: string): number | null => {
    if (!stats) return null;
    const featureStats = stats.features.find(f => f.feature === feature);
    return featureStats?.recommendedEnergy ?? null;
  }, [stats]);

  // Helper to evaluate if configured energy is appropriate
  const evaluateEnergyCost = useCallback((feature: string, configuredEnergy: number): {
    status: 'recommended' | 'too_high' | 'too_low' | 'unknown';
    recommended: number | null;
    message: string;
  } => {
    const recommended = getRecommendedEnergy(feature);
    
    if (recommended === null) {
      return { status: 'unknown', recommended: null, message: 'Keine Daten' };
    }

    const ratio = configuredEnergy / recommended;

    if (ratio >= 0.8 && ratio <= 1.5) {
      return { status: 'recommended', recommended, message: `✓ ${recommended}⚡` };
    } else if (ratio > 1.5) {
      return { status: 'too_high', recommended, message: `↓ ${recommended}⚡` };
    } else {
      return { status: 'too_low', recommended, message: `↑ ${recommended}⚡` };
    }
  }, [getRecommendedEnergy]);

  return {
    stats,
    loading,
    error,
    refresh: () => fetchStats(true),
    getRecommendedEnergy,
    evaluateEnergyCost,
  };
}
