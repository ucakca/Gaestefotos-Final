'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { EventTheme, GeneratedTheme } from '@/types/theme';

interface UseThemeApiReturn {
  themes: EventTheme[];
  generatedThemes: GeneratedTheme[];
  loading: boolean;
  error: string | null;
  fetchThemes: (params?: { eventType?: string; season?: string }) => Promise<EventTheme[]>;
  generateThemes: (params: { eventType: string; season?: string; location?: string }) => Promise<GeneratedTheme[]>;
  saveGeneratedTheme: (theme: GeneratedTheme & { eventType: string }) => Promise<EventTheme>;
  getTheme: (id: string) => Promise<EventTheme | null>;
}

export function useThemeApi(): UseThemeApiReturn {
  const [themes, setThemes] = useState<EventTheme[]>([]);
  const [generatedThemes, setGeneratedThemes] = useState<GeneratedTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThemes = useCallback(async (params?: { eventType?: string; season?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/event-themes', { params });
      setThemes(data.themes);
      return data.themes as EventTheme[];
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Fehler beim Laden der Themes';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const generateThemes = useCallback(async (params: { eventType: string; season?: string; location?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/event-themes/generate', params);
      setGeneratedThemes(data.themes);
      return data.themes as GeneratedTheme[];
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Theme-Generierung fehlgeschlagen';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveGeneratedTheme = useCallback(async (theme: GeneratedTheme & { eventType: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/event-themes/new/save-generated', theme);
      return data.theme as EventTheme;
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Fehler beim Speichern des Themes';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getTheme = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/event-themes/${id}`);
      return data.theme as EventTheme;
    } catch {
      return null;
    }
  }, []);

  return {
    themes,
    generatedThemes,
    loading,
    error,
    fetchThemes,
    generateThemes,
    saveGeneratedTheme,
    getTheme,
  };
}
