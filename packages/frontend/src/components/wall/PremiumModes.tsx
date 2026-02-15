'use client';

import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface PremiumModesProps {
  photos: Array<{ id: string; url: string }>;
  mode: 'holographic' | 'ai-smart' | 'cinema';
  currentIndex?: number;
}

// Holographic Mode
export function HolographicMode({ photos }: PremiumModesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [photos.length]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-slate-900"
      onMouseMove={handleMouseMove}
    >
      {/* Holographic Grid Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* 3D Card */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: 1000 }}
      >
        <motion.div
          className="relative w-[600px] h-[400px]"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Main Photo */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden">
            <Image
              src={photos[currentIndex]?.url || ''}
              alt=""
              fill
              className="object-cover"
            />
            
            {/* Holographic Overlay */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,0,255,0.1) 0%, rgba(0,255,255,0.1) 50%, rgba(255,255,0,0.1) 100%)',
                mixBlendMode: 'overlay',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
            />

            {/* Scan Lines */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)',
              }}
            />

            {/* Rainbow Border */}
            <div 
              className="absolute -inset-1 rounded-2xl opacity-60"
              style={{
                background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff)',
                backgroundSize: '400% 400%',
                animation: 'rainbow 3s linear infinite',
                zIndex: -1,
              }}
            />
          </div>

          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-400"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                translateZ: 100 + Math.random() * 100,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Holographic Text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <motion.p
          className="text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          HOLOGRAFISCH
        </motion.p>
      </div>
    </div>
  );
}

// AI Smart Transitions Mode
export function AISmartMode({ photos }: PremiumModesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detectedContent, setDetectedContent] = useState<'faces' | 'action' | 'scenery' | null>(null);
  const [transitionType, setTransitionType] = useState<string>('');

  // Simulated AI detection
  useEffect(() => {
    const analyzePhoto = () => {
      const types: Array<'faces' | 'action' | 'scenery'> = ['faces', 'action', 'scenery'];
      const detected = types[Math.floor(Math.random() * types.length)];
      setDetectedContent(detected);
      
      // Set transition based on content
      switch (detected) {
        case 'faces':
          setTransitionType('Gentle Zoom + Soft Focus');
          break;
        case 'action':
          setTransitionType('Quick Cut + Motion Blur');
          break;
        case 'scenery':
          setTransitionType('Slow Pan + Parallax');
          break;
      }
    };

    analyzePhoto();
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
      analyzePhoto();
    }, 5000);

    return () => clearInterval(interval);
  }, [photos.length]);

  const getTransitionVariants = () => {
    switch (detectedContent) {
      case 'faces':
        return {
          enter: { scale: 1.1, opacity: 0, filter: 'blur(10px)' },
          center: { scale: 1, opacity: 1, filter: 'blur(0px)' },
          exit: { scale: 1.05, opacity: 0, filter: 'blur(5px)' },
        };
      case 'action':
        return {
          enter: { x: 100, opacity: 0, filter: 'blur(20px)' },
          center: { x: 0, opacity: 1, filter: 'blur(0px)' },
          exit: { x: -100, opacity: 0, filter: 'blur(20px)' },
        };
      case 'scenery':
        return {
          enter: { scale: 1.2, opacity: 0, x: -50 },
          center: { scale: 1, opacity: 1, x: 0 },
          exit: { scale: 1.1, opacity: 0, x: 50 },
        };
      default:
        return {
          enter: { opacity: 0 },
          center: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  const variants = getTransitionVariants();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Photo */}
      <motion.div
        key={currentIndex}
        className="absolute inset-0"
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        transition={{ duration: detectedContent === 'action' ? 0.3 : 1.5, ease: 'easeOut' }}
      >
        <Image
          src={photos[currentIndex]?.url || ''}
          alt=""
          fill
          className="object-cover"
        />
      </motion.div>

      {/* AI Analysis HUD */}
      <div className="absolute top-8 left-8 p-4 bg-black/50 backdrop-blur-md rounded-xl border border-white/20">
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-white/60 text-xs uppercase tracking-wider">KI-Analyse</span>
        </div>
        
        <motion.p
          key={detectedContent}
          className="text-white font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Erkannt: {detectedContent === 'faces' ? 'Gesichter' : detectedContent === 'action' ? 'Aktion' : detectedContent === 'scenery' ? 'Landschaft' : 'analysiere...'}
        </motion.p>
        
        <motion.p
          key={transitionType}
          className="text-cyan-400 text-sm mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Übergang: {transitionType}
        </motion.p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-2">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-8 bg-cyan-400/50 rounded-full"
              animate={{ scaleY: [0.3, 1, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
        <span className="text-white/40 text-xs font-mono">KI-VERARBEITUNG</span>
      </div>
    </div>
  );
}

// Cinema Mode
export function CinemaMode({ photos }: PremiumModesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Letterbox Bars */}
      <div className="absolute top-0 left-0 right-0 h-[10vh] bg-black z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-[10vh] bg-black z-10" />

      {/* Main Content Area */}
      <div className="absolute top-[10vh] bottom-[10vh] left-0 right-0">
        <motion.div
          key={currentIndex}
          className="relative w-full h-full"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.05, opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <Image
            src={photos[currentIndex]?.url || ''}
            alt=""
            fill
            className="object-cover"
          />
          
          {/* Vintage Color Grading */}
          <div 
            className="absolute inset-0 mix-blend-overlay opacity-40"
            style={{
              background: 'linear-gradient(to bottom, rgba(62, 39, 35, 0.3) 0%, transparent 50%, rgba(62, 39, 35, 0.3) 100%)',
            }}
          />
          
          {/* Film Grain */}
          <div 
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Vignette */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </motion.div>
      </div>

      {/* Projector Sound Visual */}
      <div className="absolute top-[12vh] left-8 z-20 flex items-center gap-2">
        <motion.div
          className="w-3 h-3 rounded-full bg-amber-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.1, repeat: Infinity }}
        />
        <span className="text-amber-500/60 text-xs font-mono tracking-wider">PROJEKTION AKTIV</span>
      </div>

      {/* Frame Counter */}
      <div className="absolute bottom-[12vh] right-8 z-20 text-amber-500/60 text-xs font-mono">
        BILD: {String(currentIndex + 1).padStart(4, '0')} / {String(photos.length).padStart(4, '0')}
      </div>
    </div>
  );
}
