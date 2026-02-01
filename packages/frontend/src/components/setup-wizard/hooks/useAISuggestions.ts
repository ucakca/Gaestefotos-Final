'use client';

import { useState, useCallback } from 'react';

interface AIStatus {
  available: boolean;
  provider: string;
  model: string;
}

interface UseAISuggestionsReturn {
  // State
  isLoading: boolean;
  error: string | null;
  
  // Methods
  suggestAlbums: (eventType: string, eventTitle?: string) => Promise<string[]>;
  suggestDescription: (eventType: string, eventTitle: string, eventDate?: string) => Promise<string>;
  suggestInvitation: (eventType: string, eventTitle: string, hostName?: string) => Promise<string>;
  suggestChallenges: (eventType: string) => Promise<{ title: string; description: string }[]>;
  suggestGuestbook: (eventType: string, eventTitle: string) => Promise<string>;
  checkStatus: () => Promise<AIStatus>;
}

export function useAISuggestions(): UseAISuggestionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T>(
    endpoint: string,
    body: Record<string, any>
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'KI-Anfrage fehlgeschlagen');
      }
      
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suggestAlbums = useCallback(async (
    eventType: string,
    eventTitle?: string
  ): Promise<string[]> => {
    const result = await apiCall<{ albums: string[] }>('suggest-albums', {
      eventType,
      eventTitle,
    });
    return result.albums;
  }, [apiCall]);

  const suggestDescription = useCallback(async (
    eventType: string,
    eventTitle: string,
    eventDate?: string
  ): Promise<string> => {
    const result = await apiCall<{ description: string }>('suggest-description', {
      eventType,
      eventTitle,
      eventDate,
    });
    return result.description;
  }, [apiCall]);

  const suggestInvitation = useCallback(async (
    eventType: string,
    eventTitle: string,
    hostName?: string
  ): Promise<string> => {
    const result = await apiCall<{ text: string }>('suggest-invitation', {
      eventType,
      eventTitle,
      hostName,
    });
    return result.text;
  }, [apiCall]);

  const suggestChallenges = useCallback(async (
    eventType: string
  ): Promise<{ title: string; description: string }[]> => {
    const result = await apiCall<{ challenges: { title: string; description: string }[] }>('suggest-challenges', {
      eventType,
    });
    return result.challenges;
  }, [apiCall]);

  const suggestGuestbook = useCallback(async (
    eventType: string,
    eventTitle: string
  ): Promise<string> => {
    const result = await apiCall<{ message: string }>('suggest-guestbook', {
      eventType,
      eventTitle,
    });
    return result.message;
  }, [apiCall]);

  const checkStatus = useCallback(async (): Promise<AIStatus> => {
    const response = await fetch('/api/ai/status');
    return await response.json();
  }, []);

  return {
    isLoading,
    error,
    suggestAlbums,
    suggestDescription,
    suggestInvitation,
    suggestChallenges,
    suggestGuestbook,
    checkStatus,
  };
}
