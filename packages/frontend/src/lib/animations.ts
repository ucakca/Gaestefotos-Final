import confetti from 'canvas-confetti';

// Framer Motion Variants
export const buttonHover = {
  scale: 1.02,
  boxShadow: '0 4px 12px rgba(92, 107, 77, 0.3)',
  transition: { duration: 0.2 }
};

export const buttonTap = {
  scale: 0.98
};

export const cardHover = {
  y: -4,
  boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
  transition: { type: 'spring', stiffness: 300, damping: 20 }
};

export const uploadSuccess = {
  scale: [1, 1.05, 1],
  transition: { duration: 0.3 }
};

export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const slideUp = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 50 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

// Confetti Configurations
export const confettiConfig = {
  default: {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  },
  upload: {
    particleCount: 80,
    spread: 60,
    origin: { y: 0.65 },
    colors: ['#5c6b4d', '#8fa377', '#d4af37', '#f5d061'],
    startVelocity: 30,
    gravity: 0.8,
    ticks: 200
  },
  celebration: {
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5 },
    colors: ['#e8b4b8', '#f5d5d8', '#d4af37', '#5c6b4d'],
    startVelocity: 45
  },
  subtle: {
    particleCount: 30,
    spread: 40,
    origin: { y: 0.7 },
    scalar: 0.8,
    ticks: 100
  }
};

// Helper Functions
export const triggerUploadConfetti = () => {
  confetti(confettiConfig.upload);
};

export const triggerCelebrationConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...confettiConfig.celebration,
      particleCount,
      origin: {
        x: randomInRange(0.1, 0.3),
        y: Math.random() - 0.2
      }
    });
    confetti({
      ...confettiConfig.celebration,
      particleCount,
      origin: {
        x: randomInRange(0.7, 0.9),
        y: Math.random() - 0.2
      }
    });
  }, 250);
};

export const triggerSubtleConfetti = () => {
  confetti(confettiConfig.subtle);
};
