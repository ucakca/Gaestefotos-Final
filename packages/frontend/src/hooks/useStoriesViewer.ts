import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export function useStoriesViewer(eventId: string | null, reloadKey: number) {
  const [stories, setStories] = useState<any[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  const storyProgressRafRef = useRef<number | null>(null);
  const storyProgressStartedAtRef = useRef<number>(0);
  const storyProgressRef = useRef<number>(0);
  const storyPausedRef = useRef<boolean>(false);
  const viewedStoriesRef = useRef<Set<string>>(new Set());

  const STORY_DURATION_MS = 6000;

  const loadStories = async () => {
    if (!eventId) return;
    try {
      const { data } = await api.get(`/events/${eventId}/stories`);
      setStories(Array.isArray(data?.stories) ? data.stories : []);
    } catch {
      setStories([]);
    }
  };

  useEffect(() => {
    loadStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, reloadKey]);

  useEffect(() => {
    const trackView = async () => {
      if (selectedStoryIndex === null) return;
      const s = stories[selectedStoryIndex];
      const storyId = s?.id ? String(s.id) : '';
      if (!storyId) return;
      if (viewedStoriesRef.current.has(storyId)) return;
      viewedStoriesRef.current.add(storyId);
      try {
        await api.post(`/events/${storyId}/view`);
      } catch {
        // ignore
      }
    };
    trackView();
  }, [selectedStoryIndex, stories]);

  useEffect(() => {
    storyProgressRef.current = storyProgress;
  }, [storyProgress]);

  useEffect(() => {
    if (storyProgressRafRef.current !== null) {
      cancelAnimationFrame(storyProgressRafRef.current);
      storyProgressRafRef.current = null;
    }

    if (selectedStoryIndex === null || !stories[selectedStoryIndex]) {
      setStoryProgress(0);
      return;
    }

    setStoryProgress(0);
    storyProgressStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = () => {
      if (selectedStoryIndex === null) return;

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (storyPausedRef.current) {
        storyProgressStartedAtRef.current = now - storyProgressRef.current * STORY_DURATION_MS;
        storyProgressRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - storyProgressStartedAtRef.current;
      const nextProgress = Math.min(1, elapsed / STORY_DURATION_MS);
      setStoryProgress(nextProgress);
      storyProgressRef.current = nextProgress;

      if (nextProgress >= 1) {
        setSelectedStoryIndex((i) => {
          if (i === null) return null;
          if (stories.length <= 1) return null;
          if (i >= stories.length - 1) return null;
          return i + 1;
        });
        return;
      }

      storyProgressRafRef.current = requestAnimationFrame(tick);
    };

    storyProgressRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (storyProgressRafRef.current !== null) {
        cancelAnimationFrame(storyProgressRafRef.current);
        storyProgressRafRef.current = null;
      }
    };
  }, [selectedStoryIndex, stories]);

  const onStoryPrev = () => {
    setSelectedStoryIndex((i) => {
      if (i === null) return 0;
      if (stories.length <= 1) return i;
      return (i - 1 + stories.length) % stories.length;
    });
  };

  const onStoryNext = () => {
    setSelectedStoryIndex((i) => {
      if (i === null) return 0;
      if (stories.length <= 1) return i;
      return (i + 1) % stories.length;
    });
  };

  const onStoryPause = () => {
    storyPausedRef.current = true;
  };

  const onStoryResume = () => {
    storyPausedRef.current = false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    storyProgressStartedAtRef.current = now - storyProgressRef.current * STORY_DURATION_MS;
  };

  return {
    stories,
    selectedStoryIndex,
    setSelectedStoryIndex,
    storyProgress,
    onStoryPrev,
    onStoryNext,
    onStoryPause,
    onStoryResume,
    reloadStories: loadStories,
  };
}
