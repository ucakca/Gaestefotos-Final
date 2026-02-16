/**
 * Confetti-Animation für erfolgreiche Uploads
 * Lightweight wrapper für canvas-confetti
 * Lazy-loaded: canvas-confetti wird erst beim ersten Aufruf importiert
 */

let confettiModule: any = null;

async function getConfetti() {
  if (!confettiModule) {
    const mod = await import('canvas-confetti');
    confettiModule = mod.default || mod;
  }
  return confettiModule as (options?: any) => Promise<null> | null;
}

/**
 * Trigger Confetti-Animation für erfolgreichen Upload
 * Performance: <10ms, non-blocking
 */
export async function triggerUploadConfetti() {
  const confetti = await getConfetti();
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
export async function triggerCelebrationConfetti() {
  const confetti = await getConfetti();
  const colors = ['#e879a6', '#f9a825', '#ffd54f', '#ff9999'];

  // Zwei Bursts für mehr Impact
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors,
  });

  setTimeout(async () => {
    const c = await getConfetti();
    c({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.7 },
      colors,
      startVelocity: 25,
    });
  }, 200);
}
