'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

// ─── Device ID Management ───────────────────────────────────

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  const KEY = 'gf_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ─── Types ──────────────────────────────────────────────────

export interface EnergyBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  rewardsClaimed: string[];
  cooldownActive: boolean;
  cooldownEndsAt: string | null;
  energyEnabled: boolean;
}

export interface EnergyConfig {
  startBalance: number;
  rewards: Record<string, number>;
  costs: Record<string, number>;
  cooldownSeconds: number;
  enabled: boolean;
}

export type EnergyRewardType =
  | 'event_join'
  | 'first_upload'
  | 'guestbook'
  | 'challenge'
  | 'survey'
  | 'social_share';

// ─── Hook ───────────────────────────────────────────────────

export function useAiEnergy(eventId: string | null) {
  const [energy, setEnergy] = useState<EnergyBalance | null>(null);
  const [config, setConfig] = useState<EnergyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const deviceIdRef = useRef<string>('');

  // Initialize device ID
  useEffect(() => {
    deviceIdRef.current = getOrCreateDeviceId();
  }, []);

  // Fetch energy balance
  const fetchBalance = useCallback(async () => {
    if (!eventId || !deviceIdRef.current) return;

    try {
      const { data } = await api.get(`/events/${eventId}/energy`, {
        headers: { 'x-device-id': deviceIdRef.current },
      });
      setEnergy(data.energy);
    } catch (err) {
      // Energy system failure = treat as unlimited (fail-open)
      setEnergy({
        balance: 9999,
        totalEarned: 0,
        totalSpent: 0,
        rewardsClaimed: [],
        cooldownActive: false,
        cooldownEndsAt: null,
        energyEnabled: false,
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Fetch energy config (rewards/costs)
  const fetchConfig = useCallback(async () => {
    if (!eventId) return;
    try {
      const { data } = await api.get(`/events/${eventId}/energy/config`);
      setConfig(data.config);
    } catch {
      // Ignore config fetch errors
    }
  }, [eventId]);

  // Initial load
  useEffect(() => {
    if (eventId && deviceIdRef.current) {
      fetchBalance();
      fetchConfig();
    }
  }, [eventId, fetchBalance, fetchConfig]);

  // Claim a reward
  const claimReward = useCallback(async (
    rewardType: EnergyRewardType,
    instanceId?: string,
  ): Promise<{ earned: boolean; amount: number; newBalance: number }> => {
    if (!eventId || !deviceIdRef.current) {
      return { earned: false, amount: 0, newBalance: energy?.balance ?? 0 };
    }

    try {
      const { data } = await api.post(`/events/${eventId}/energy/reward`, {
        rewardType,
        instanceId,
      }, {
        headers: { 'x-device-id': deviceIdRef.current },
      });

      if (data.reward?.earned) {
        setEnergy(prev => prev ? {
          ...prev,
          balance: data.reward.newBalance,
          totalEarned: prev.totalEarned + data.reward.amount,
          rewardsClaimed: [...prev.rewardsClaimed, instanceId ? `${rewardType}:${instanceId}` : rewardType],
        } : prev);
      }

      return data.reward;
    } catch {
      return { earned: false, amount: 0, newBalance: energy?.balance ?? 0 };
    }
  }, [eventId, energy?.balance]);

  // Check if guest can afford a feature (pre-check, actual deduction happens server-side)
  const canAfford = useCallback((costCategory: string): boolean => {
    if (!energy || !energy.energyEnabled) return true;
    if (!config) return true;
    const cost = config.costs[costCategory] ?? 1;
    return energy.balance >= cost;
  }, [energy, config]);

  // Get cost for a category
  const getCost = useCallback((costCategory: string): number => {
    if (!config) return 1;
    return config.costs[costCategory] ?? 1;
  }, [config]);

  // Check if a reward has been claimed
  const isRewardClaimed = useCallback((rewardType: string, instanceId?: string): boolean => {
    if (!energy) return false;
    const key = instanceId ? `${rewardType}:${instanceId}` : rewardType;
    return energy.rewardsClaimed.includes(key);
  }, [energy]);

  // Handle energy deduction response from AI endpoint (429 = insufficient energy)
  const handleEnergyError = useCallback((error: any): { isEnergyError: boolean; message: string } => {
    if (error?.response?.status === 429 && error?.response?.data?.code === 'INSUFFICIENT_ENERGY') {
      const energyData = error.response.data.energy;
      // Update local state with server response
      if (energyData) {
        setEnergy(prev => prev ? {
          ...prev,
          balance: energyData.currentBalance ?? prev.balance,
          cooldownActive: energyData.cooldownActive ?? false,
          cooldownEndsAt: energyData.cooldownEndsAt ?? null,
        } : prev);
      }
      return {
        isEnergyError: true,
        message: energyData?.reason === 'cooldown'
          ? 'Cooldown aktiv — bitte warte einen Moment ⏳'
          : 'Nicht genug AI-Energie ⚡ Nimm am Event teil um aufzuladen!',
      };
    }
    return { isEnergyError: false, message: '' };
  }, []);

  // Refresh balance after a successful AI call (server already deducted)
  const refreshAfterSpend = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Get the device ID for API calls
  const getDeviceId = useCallback(() => deviceIdRef.current, []);

  return {
    energy,
    config,
    loading,
    deviceId: deviceIdRef.current,
    getDeviceId,
    fetchBalance,
    claimReward,
    canAfford,
    getCost,
    isRewardClaimed,
    handleEnergyError,
    refreshAfterSpend,
    // Convenience
    balance: energy?.balance ?? 0,
    isEnabled: energy?.energyEnabled ?? true,
    cooldownActive: energy?.cooldownActive ?? false,
    cooldownEndsAt: energy?.cooldownEndsAt ?? null,
  };
}
