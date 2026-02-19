/**
 * useAiFeatureRegistry — Single Source of Truth for AI Features
 * 
 * Loads the AI Feature Registry from the backend API instead of hardcoding.
 * Used by: Event-Detail, Packages, AI Features pages
 * 
 * Features are cached for the session to avoid repeated API calls.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// ─── Types (mirrored from backend aiFeatureRegistry.ts) ───────

export type DeviceType = 'guest_app' | 'photo_booth' | 'mirror_booth' | 'ki_booth' | 'admin_dashboard';

export type AiPackageCategory = 'games' | 'imageEffects' | 'gifVideo' | 'advanced' | 'hostTools' | 'styleTransfer' | 'recognition';

export interface AiFeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: 'text' | 'game' | 'image' | 'video' | 'recognition';
  providerType: 'LLM' | 'IMAGE_GEN' | 'VIDEO_GEN' | 'FACE_RECOGNITION' | 'STT' | 'TTS';
  creditCost: number;
  isWorkflow: boolean;
  allowedDevices: DeviceType[];
  packageCategory: AiPackageCategory;
}

export interface AiCategoryGroup {
  key: string;
  label: string;
  icon: string;
  packageFeatureKey: string; // e.g. 'allowAiGames' — maps to PackageDefinition field
  features: AiFeatureDefinition[];
}

export interface AiFeatureRegistry {
  features: AiFeatureDefinition[];
  categories: AiCategoryGroup[];
  packageCategoryMap: Record<AiPackageCategory, string>;
}

// ─── Cache ────────────────────────────────────────────────────

let cachedRegistry: AiFeatureRegistry | null = null;
let cachePromise: Promise<AiFeatureRegistry> | null = null;

async function fetchRegistry(): Promise<AiFeatureRegistry> {
  const res = await api.get<AiFeatureRegistry>('/admin/ai-providers/registry');
  // Validate response has expected structure
  if (!res.data?.features || !res.data?.categories) {
    throw new Error('Invalid registry response');
  }
  return res.data;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useAiFeatureRegistry() {
  const [registry, setRegistry] = useState<AiFeatureRegistry | null>(cachedRegistry);
  const [loading, setLoading] = useState(!cachedRegistry);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // If already cached, use it
    if (cachedRegistry) {
      setRegistry(cachedRegistry);
      setLoading(false);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (cachePromise) {
      try {
        const data = await cachePromise;
        setRegistry(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load AI registry');
        setLoading(false);
      }
      return;
    }

    // Start new fetch
    setLoading(true);
    cachePromise = fetchRegistry();

    try {
      const data = await cachePromise;
      cachedRegistry = data;
      setRegistry(data);
      setError(null);
    } catch (err: any) {
      // Don't cache failed requests - allow retry
      cachePromise = null;
      cachedRegistry = null;
      setError(err.message || 'Failed to load AI registry');
    } finally {
      setLoading(false);
      cachePromise = null;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Force refresh (clears cache)
  const refresh = useCallback(async () => {
    cachedRegistry = null;
    cachePromise = null;
    setLoading(true);
    try {
      const data = await fetchRegistry();
      cachedRegistry = data;
      setRegistry(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI registry');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    registry,
    loading,
    error,
    refresh,
    // Convenience accessors
    features: registry?.features || [],
    categories: registry?.categories || [],
    packageCategoryMap: registry?.packageCategoryMap || {},
  };
}

// ─── Utility Functions ────────────────────────────────────────

/**
 * Get feature by key from registry
 */
export function getFeatureFromRegistry(
  registry: AiFeatureRegistry | null,
  key: string
): AiFeatureDefinition | undefined {
  return registry?.features.find(f => f.key === key);
}

/**
 * Build FEATURE_META-like lookup from registry
 * For backwards compatibility with existing code patterns
 */
export function buildFeatureMetaMap(
  registry: AiFeatureRegistry | null
): Record<string, { label: string; description: string; category: string; providerType: string; creditCost: number }> {
  if (!registry) return {};
  return Object.fromEntries(
    registry.features.map(f => [f.key, {
      label: f.label,
      description: f.description,
      category: f.category,
      providerType: f.providerType,
      creditCost: f.creditCost,
    }])
  );
}

/**
 * Build AI_CATEGORIES-like structure from registry
 * For backwards compatibility with Event-Detail page pattern
 */
export function buildAiCategories(
  registry: AiFeatureRegistry | null
): { key: string; label: string; icon: string; features: { key: string; label: string }[] }[] {
  if (!registry) return [];
  return registry.categories.map(cat => ({
    key: cat.key,
    label: cat.label,
    icon: cat.icon,
    features: cat.features.map(f => ({ key: f.key, label: f.label })),
  }));
}

/**
 * Build PKG_AI_CATEGORIES-like structure from registry
 * For backwards compatibility with Packages page pattern
 */
export function buildPkgAiCategories(
  registry: AiFeatureRegistry | null
): { key: string; label: string; icon: string; catField: string; features: { key: string; label: string }[] }[] {
  if (!registry) return [];
  return registry.categories.map(cat => ({
    key: cat.key,
    label: cat.label,
    icon: cat.icon,
    catField: cat.packageFeatureKey,
    features: cat.features.map(f => ({ key: f.key, label: f.label })),
  }));
}

export default useAiFeatureRegistry;
