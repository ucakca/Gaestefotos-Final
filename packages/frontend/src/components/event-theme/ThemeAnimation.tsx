'use client';

import React from 'react';
import { motion, type Variants, type Transition } from 'framer-motion';
import { useEventTheme } from './EventThemeProvider';
import type { ThemeAnimation as ThemeAnimationType } from '@/types/theme';

// ─── Easing Map ──────────────────────────────────────────────

const EASING_MAP: Record<string, number[] | string> = {
  easeOut: [0.0, 0.0, 0.2, 1],
  easeInOut: [0.4, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  spring: 'easeOut', // fallback; actual spring uses type:"spring"
  linear: [0, 0, 1, 1],
};

function getTransition(anim: ThemeAnimationType): Transition {
  if (anim.easing === 'spring') {
    return { type: 'spring', duration: anim.duration / 1000, bounce: 0.3 };
  }
  return {
    duration: anim.duration / 1000,
    ease: EASING_MAP[anim.easing] || EASING_MAP.easeOut,
  };
}

// ─── Entrance Variants ──────────────────────────────────────

function getEntranceVariants(anim: ThemeAnimationType): Variants {
  const transition = getTransition(anim);

  const variantMap: Record<string, Variants> = {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition },
    },
    fadeUp: {
      hidden: { opacity: 0, y: 24 },
      visible: { opacity: 1, y: 0, transition },
    },
    fadeScale: {
      hidden: { opacity: 0, scale: 0.92 },
      visible: { opacity: 1, scale: 1, transition },
    },
    slideUp: {
      hidden: { opacity: 0, y: 40 },
      visible: { opacity: 1, y: 0, transition },
    },
    bounceIn: {
      hidden: { opacity: 0, scale: 0.3 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', duration: anim.duration / 1000, bounce: 0.5 },
      },
    },
    popIn: {
      hidden: { opacity: 0, scale: 0.5 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', duration: anim.duration / 1000, bounce: 0.4 },
      },
    },
    growIn: {
      hidden: { opacity: 0, scale: 0, borderRadius: '50%' },
      visible: {
        opacity: 1,
        scale: 1,
        borderRadius: '0%',
        transition: { type: 'spring', duration: anim.duration / 1000, bounce: 0.3 },
      },
    },
  };

  return variantMap[anim.type] || variantMap.fadeIn;
}

// ─── Hover Variants ─────────────────────────────────────────

function getHoverProps(anim: ThemeAnimationType): Record<string, any> {
  const duration = anim.duration / 1000;

  const hoverMap: Record<string, Record<string, any>> = {
    lift: { y: -4, transition: { duration } },
    scale: { scale: 1.05, transition: { duration } },
    glow: { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)', transition: { duration } },
    neonGlow: { boxShadow: '0 0 30px rgba(123, 47, 247, 0.5)', transition: { duration } },
    shimmer: { opacity: [1, 0.8, 1], transition: { duration: duration * 2, repeat: Infinity } },
    sparkle: { scale: [1, 1.02, 1], opacity: [1, 0.9, 1], transition: { duration, repeat: 1 } },
    underline: { textDecoration: 'underline', transition: { duration } },
    borderHighlight: { borderColor: 'var(--theme-accent, #6366F1)', transition: { duration } },
    gradientShift: { filter: 'hue-rotate(15deg)', transition: { duration } },
    softBounce: { y: -2, transition: { type: 'spring', bounce: 0.6, duration } },
    wiggle: { rotate: [0, -2, 2, -1, 0], transition: { duration } },
    warmGlow: { boxShadow: '0 0 24px rgba(217, 119, 6, 0.25)', transition: { duration } },
  };

  return hoverMap[anim.type] || hoverMap.lift;
}

// ─── ThemeAnimation Component ───────────────────────────────

interface ThemeAnimationProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
  delay?: number;
  enableHover?: boolean;
  enableEntrance?: boolean;
  once?: boolean;
  amount?: number;
}

export function ThemeAnimation({
  children,
  className,
  style,
  as = 'div',
  delay = 0,
  enableHover = true,
  enableEntrance = true,
  once = true,
  amount = 0.2,
}: ThemeAnimationProps) {
  const { animations, isThemed } = useEventTheme();

  // No animations if no theme is set
  if (!isThemed) {
    const Tag = as as any;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  const entranceVariants = enableEntrance ? getEntranceVariants(animations.entrance) : undefined;
  const hoverProps = enableHover ? getHoverProps(animations.hover) : undefined;

  const MotionTag = motion[as as keyof typeof motion] as any;
  if (!MotionTag) {
    return (
      <motion.div
        className={className}
        style={style}
        variants={entranceVariants}
        initial={enableEntrance ? 'hidden' : undefined}
        whileInView={enableEntrance ? 'visible' : undefined}
        whileHover={hoverProps}
        viewport={{ once, amount }}
        transition={delay > 0 ? { delay: delay / 1000 } : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
      variants={entranceVariants}
      initial={enableEntrance ? 'hidden' : undefined}
      whileInView={enableEntrance ? 'visible' : undefined}
      whileHover={hoverProps}
      viewport={{ once, amount }}
      transition={delay > 0 ? { delay: delay / 1000 } : undefined}
    >
      {children}
    </MotionTag>
  );
}

// ─── Staggered Children Wrapper ─────────────────────────────

interface ThemeStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function ThemeStagger({ children, className, staggerDelay = 80 }: ThemeStaggerProps) {
  const { animations, isThemed } = useEventTheme();

  if (!isThemed) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay / 1000,
        delayChildren: 0.1,
      },
    },
  };

  const childVariants = getEntranceVariants(animations.entrance);

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div variants={childVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── Themed Heading ─────────────────────────────────────────

interface ThemedHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export function ThemedHeading({ children, level = 2, className = '' }: ThemedHeadingProps) {
  const { fonts, colors, isThemed } = useEventTheme();

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  if (!isThemed) {
    const El = Tag as any;
    return <El className={className}>{children}</El>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      {React.createElement(Tag, {
        className,
        style: {
          fontFamily: `"${fonts.heading}", serif`,
          color: colors.text,
        },
      }, children)}
    </motion.div>
  );
}

// ─── Themed Text ────────────────────────────────────────────

interface ThemedTextProps {
  children: React.ReactNode;
  variant?: 'body' | 'accent' | 'muted';
  className?: string;
  as?: 'p' | 'span' | 'div';
}

export function ThemedText({ children, variant = 'body', className = '', as: Tag = 'p' }: ThemedTextProps) {
  const { fonts, colors, isThemed } = useEventTheme();

  if (!isThemed) {
    return React.createElement(Tag, { className }, children);
  }

  const fontFamily = variant === 'accent'
    ? `"${fonts.accent}", sans-serif`
    : `"${fonts.body}", sans-serif`;

  const color = variant === 'muted' ? colors.textMuted : colors.text;

  return React.createElement(Tag, {
    className,
    style: { fontFamily, color },
  }, children);
}
