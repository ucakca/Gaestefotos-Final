/**
 * Confetti-Animation für erfolgreiche Uploads
 * Lightweight wrapper für canvas-confetti
 */

import confetti from 'canvas-confetti';

/**
 * Trigger Confetti-Animation für erfolgreichen Upload
 * Performance: <10ms, non-blocking
 */
export function triggerUploadConfetti() {
  // Festliche Farben (Rose, Gold)
  const colors = ['#e879a6', '#f9a825', '#ffd54f', '#ff9999'];

  // Kurze, subtile Animation
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors,
    ticks: 100,
    gravity: 1.2,
    scalar: 0.8,
  });
}

/**
 * Trigger größere Confetti-Animation (z.B. Event erstellt)
 */
export function triggerCelebrationConfetti() {
  const colors = ['#e879a6', '#f9a825', '#ffd54f', '#ff9999'];

  // Zwei Bursts für mehr Impact
  const burst1 = confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors,
  });

  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.7 },
      colors,
      startVelocity: 25,
    });
  }, 200);
}
