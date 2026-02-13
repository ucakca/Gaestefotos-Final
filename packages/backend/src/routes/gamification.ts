import { Router, Response } from 'express';
import prisma from '../config/database';
import { optionalAuthMiddleware, AuthRequest, hasEventAccess } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

// ─── ACHIEVEMENT DEFINITIONS (seeded on first request) ──────────────────────

const ACHIEVEMENT_SEEDS = [
  // PHOTO
  { key: 'first_upload', title: 'Erster Upload', description: 'Lade dein erstes Foto hoch', icon: '📸', category: 'PHOTO', threshold: 1, points: 10 },
  { key: 'photo_5', title: 'Fleißiger Fotograf', description: '5 Fotos hochgeladen', icon: '🎯', category: 'PHOTO', threshold: 5, points: 25 },
  { key: 'photo_10', title: 'Foto-Marathon', description: '10 Fotos hochgeladen', icon: '🏃', category: 'PHOTO', threshold: 10, points: 50 },
  { key: 'photo_25', title: 'Paparazzi', description: '25 Fotos hochgeladen', icon: '📷', category: 'PHOTO', threshold: 25, points: 100 },
  // GAME
  { key: 'first_game', title: 'Spieler', description: 'Spiele dein erstes Foto-Spiel', icon: '🎮', category: 'GAME', threshold: 1, points: 15 },
  { key: 'game_master', title: 'Game Master', description: '5 Foto-Spiele abgeschlossen', icon: '🏆', category: 'GAME', threshold: 5, points: 50 },
  { key: 'game_champion', title: 'Champion', description: '10 Foto-Spiele abgeschlossen', icon: '👑', category: 'GAME', threshold: 10, points: 100 },
  // GUESTBOOK
  { key: 'first_guestbook', title: 'Gästebuch-Eintrag', description: 'Schreibe deinen ersten Eintrag', icon: '📖', category: 'GUESTBOOK', threshold: 1, points: 15 },
  // SOCIAL
  { key: 'first_like', title: 'Likes geben', description: 'Like dein erstes Foto', icon: '❤️', category: 'SOCIAL', threshold: 1, points: 5 },
  { key: 'social_butterfly', title: 'Social Butterfly', description: '10 Likes vergeben', icon: '🦋', category: 'SOCIAL', threshold: 10, points: 30 },
  // KI_KUNST
  { key: 'first_ki', title: 'KI-Künstler', description: 'Erstelle dein erstes KI-Kunstwerk', icon: '🎨', category: 'KI_KUNST', threshold: 1, points: 20 },
  { key: 'ki_master', title: 'KI-Meister', description: '5 KI-Kunstwerke erstellt', icon: '🖼️', category: 'KI_KUNST', threshold: 5, points: 75 },
  // SPECIAL
  { key: 'early_bird', title: 'Early Bird', description: 'Lade ein Foto in den ersten 30 Minuten hoch', icon: '🐦', category: 'SPECIAL', threshold: 1, points: 25 },
  { key: 'night_owl', title: 'Nachteule', description: 'Lade ein Foto nach Mitternacht hoch', icon: '🦉', category: 'SPECIAL', threshold: 1, points: 25 },
];

async function ensureAchievementsSeed() {
  const count = await prisma.achievement.count();
  if (count > 0) return;

  await prisma.achievement.createMany({
    data: ACHIEVEMENT_SEEDS.map(a => ({
      key: a.key,
      title: a.title,
      description: a.description,
      icon: a.icon,
      category: a.category as any,
      threshold: a.threshold,
      points: a.points,
    })),
    skipDuplicates: true,
  });
  logger.info(`Seeded ${ACHIEVEMENT_SEEDS.length} achievements`);
}

// ─── GET /api/events/:eventId/achievements ─────────────────────────────────
// Returns all achievements + which ones the visitor has unlocked
router.get(
  '/:eventId/achievements',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const visitorId = (req.query.visitorId as string) || req.userId || 'anonymous';

      await ensureAchievementsSeed();

      const [achievements, userAchievements] = await Promise.all([
        prisma.achievement.findMany({ where: { isActive: true }, orderBy: { category: 'asc' } }),
        prisma.userAchievement.findMany({
          where: { eventId, visitorId },
          select: { achievementId: true, unlockedAt: true },
        }),
      ]);

      const unlockedMap = new Map(userAchievements.map(ua => [ua.achievementId, ua.unlockedAt]));

      const result = achievements.map(a => ({
        ...a,
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) || null,
      }));

      res.json({ achievements: result });
    } catch (error) {
      logger.error('Failed to get achievements', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// ─── POST /api/events/:eventId/achievements/check ──────────────────────────
// Check and unlock achievements for a visitor based on their activity
router.post(
  '/:eventId/achievements/check',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { visitorId, photoCount, gameCount, guestbookCount, likeCount, kiCount } = req.body;
      const vid = visitorId || req.userId || 'anonymous';

      await ensureAchievementsSeed();

      const achievements = await prisma.achievement.findMany({ where: { isActive: true } });
      const existing = await prisma.userAchievement.findMany({
        where: { eventId, visitorId: vid },
        select: { achievementId: true },
      });
      const existingIds = new Set(existing.map(e => e.achievementId));

      const counts: Record<string, number> = {
        PHOTO: photoCount || 0,
        GAME: gameCount || 0,
        GUESTBOOK: guestbookCount || 0,
        SOCIAL: likeCount || 0,
        KI_KUNST: kiCount || 0,
        SPECIAL: 0,
      };

      const newlyUnlocked: any[] = [];

      for (const achievement of achievements) {
        if (existingIds.has(achievement.id)) continue;

        const count = counts[achievement.category] || 0;
        if (count >= achievement.threshold) {
          try {
            const ua = await prisma.userAchievement.create({
              data: { eventId, visitorId: vid, achievementId: achievement.id },
            });
            newlyUnlocked.push({ ...achievement, unlockedAt: ua.unlockedAt });
          } catch {
            // unique constraint — already exists, skip
          }
        }
      }

      // Update leaderboard
      const totalPoints = achievements
        .filter(a => existingIds.has(a.id) || newlyUnlocked.some(n => n.id === a.id))
        .reduce((sum, a) => sum + a.points, 0);

      await prisma.leaderboard.upsert({
        where: { eventId_visitorId: { eventId, visitorId: vid } },
        update: {
          photoCount: photoCount || 0,
          gameCount: gameCount || 0,
          kiCount: kiCount || 0,
          totalScore: totalPoints,
        },
        create: {
          eventId,
          visitorId: vid,
          name: req.body.name || 'Anonym',
          photoCount: photoCount || 0,
          gameCount: gameCount || 0,
          kiCount: kiCount || 0,
          totalScore: totalPoints,
        },
      });

      res.json({ newlyUnlocked, totalPoints });
    } catch (error) {
      logger.error('Failed to check achievements', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// ─── GET /api/events/:eventId/leaderboard ──────────────────────────────────
router.get(
  '/:eventId/leaderboard',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const entries = await prisma.leaderboard.findMany({
        where: { eventId },
        orderBy: { totalScore: 'desc' },
        take: limit,
      });

      res.json({ leaderboard: entries });
    } catch (error) {
      logger.error('Failed to get leaderboard', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;
