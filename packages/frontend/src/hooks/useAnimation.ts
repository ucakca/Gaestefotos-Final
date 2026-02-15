'use client';

import { useEffect, useRef, useCallback } from 'react';

export type AnimationType = 
  | 'cinematic' 
  | 'polaroid-rain' 
  | 'coverflow' 
  | 'bento' 
  | 'liquid' 
  | 'scramble' 
  | 'infinite' 
  | 'timetravel'
  | 'holographic'
  | 'cinema';

export interface AnimationConfig {
  duration: number;
  easing: string;
  stagger: number;
  autoplay: boolean;
  loop: boolean;
}

export const defaultConfig: AnimationConfig = {
  duration: 0.8,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  stagger: 0.1,
  autoplay: true,
  loop: false,
};

export function useAnimationFrame(callback: (delta: number) => void) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const delta = time - previousTimeRef.current;
      callback(delta);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);
}

export function useScrollVelocity() {
  const velocityRef = useRef(0);
  const lastScrollRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      const delta = now - lastTimeRef.current;
      const scrollDelta = window.scrollY - lastScrollRef.current;
      velocityRef.current = scrollDelta / delta;
      lastScrollRef.current = window.scrollY;
      lastTimeRef.current = now;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return velocityRef;
}

export const easings = {
  cinematic: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  dramatic: 'cubic-bezier(0.87, 0, 0.13, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
