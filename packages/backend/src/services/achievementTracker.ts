import prisma from '../config/database';
import { io } from '../index';
import { logger } from '../utils/logger';

/**
 * Auto-check and unlock achievements for a visitor after an action.
 * Called after photo upload, guestbook entry, game completion, etc.
 * Non-blocking — fire and forget.
 */
export async function checkAchievements(
  eventId: string,
  visitorId: string,
  visitorName: string
): Promise<void> {
  try {
    if (!eventId || !visitorId) return;

    // Count visitor activity
    const [photoCount, guestbookCount, gameCompletions] = await Promise.all([
      prisma.photo.count({
        where: { eventId, uploadedBy: visitorName, status: 'APPROVED' },
      }),
      (prisma as any).guestbookEntry.count({
        where: { eventId, authorName: visitorName, status: 'APPROVED' },
      }),
      (prisma as any).challengeCompletion
        ? (prisma as any).challengeCompletion.count({
            where: { eventId, visitorId },
          }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get all achievements
    const achievements = await prisma.achievement.findMany({ where: { isActive: true } });
    const existing = await prisma.userAchievement.findMany({
      where: { eventId, visitorId },
      select: { achievementId: true },
    });
    const existingIds = new Set(existing.map(e => e.achievementId));

    const counts: Record<string, number> = {
      PHOTO: photoCount,
      GAME: gameCompletions,
      GUESTBOOK: guestbookCount,
      SOCIAL: 0,
      KI_KUNST: 0,
      SPECIAL: 0,
    };

    // Check early bird / night owl
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) counts.SPECIAL = 1; // night owl
    if (photoCount === 1) {
      // Check if within 30 min of event start (early bird) — simplified: first upload
      counts.SPECIAL = Math.max(counts.SPECIAL, 1);
    }

    const newlyUnlocked: any[] = [];

    for (const achievement of achievements) {
      if (existingIds.has(achievement.id)) continue;
      const count = counts[achievement.category] || 0;
      if (count >= achievement.threshold) {
        try {
          const ua = await prisma.userAchievement.create({
            data: { eventId, visitorId, achievementId: achievement.id },
          });
          newlyUnlocked.push({ ...achievement, unlockedAt: ua.unlockedAt });
        } catch {
          // unique constraint — skip
        }
      }
    }

    // Update leaderboard
    const totalPoints = achievements
      .filter(a => existingIds.has(a.id) || newlyUnlocked.some(n => n.id === a.id))
      .reduce((sum, a) => sum + a.points, 0);

    await prisma.leaderboard.upsert({
      where: { eventId_visitorId: { eventId, visitorId } },
      update: {
        name: visitorName || 'Anonym',
        photoCount,
        gameCount: gameCompletions,
        totalScore: totalPoints,
      },
      create: {
        eventId,
        visitorId,
        name: visitorName || 'Anonym',
        photoCount,
        gameCount: gameCompletions,
        totalScore: totalPoints,
      },
    });

    // Emit WebSocket event for newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      io.to(`event:${eventId}`).emit('achievement_unlocked', {
        visitorId,
        visitorName,
        achievements: newlyUnlocked.map(a => ({
          key: a.key,
          title: a.title,
          icon: a.icon,
          points: a.points,
        })),
      });

      logger.info('Achievements unlocked', {
        eventId,
        visitorId,
        count: newlyUnlocked.length,
        keys: newlyUnlocked.map(a => a.key),
      });
    }
  } catch (err) {
    logger.warn('Achievement check failed (non-critical)', {
      error: (err as Error).message,
      eventId,
      visitorId,
    });
  }
}
