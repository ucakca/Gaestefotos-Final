'use client';

import { useState, useEffect, useRef } from 'react';

export function useScrollHeader(threshold: number = 300) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [showJumpToTop, setShowJumpToTop] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsHeaderVisible(currentScrollY > threshold);
      setShowJumpToTop(currentScrollY > 500);
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { isHeaderVisible, showJumpToTop, scrollToTop };
}
