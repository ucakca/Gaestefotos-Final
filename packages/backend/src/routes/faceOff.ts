/**
 * Face-Off (Team Contest) Routes
 *
 * Simple team photo contest: guests join a team, their uploads count for the team,
 * live leaderboard shows photo counts per team.
 *
 * Design:
 * - Teams are stored in-memory (deviceId → teamId map), expires after 24h
 * - Photos are tagged with `team:{teamId}` when uploaded
 * - Leaderboard reads tag counts from the DB
 * - No DB migration needed — uses existing Photo.tags array
 */

import { Router, Response } from 'express';
import { AuthRequest, optionalAuthMiddleware } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// ─── In-Memory Team Assignment Store ─────────────────────────────────────────

interface TeamAssignment {
  teamId: string;
  teamName: string;
  deviceId: string;
  eventId: string;
  assignedAt: number;
}

const teamAssignments = new Map<string, TeamAssignment>(); // key: `${eventId}:${deviceId}`
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getAssignmentKey(eventId: string, deviceId: string): string {
  return `${eventId}:${deviceId}`;
}

function cleanExpiredAssignments(): void {
  const now = Date.now();
  for (const [key, assignment] of teamAssignments.entries()) {
    if (now - assignment.assignedAt > TTL_MS) {
      teamAssignments.delete(key);
    }
  }
}

// Auto-cleanup every hour
setInterval(cleanExpiredAssignments, 60 * 60 * 1000);

// ─── Helper ──────────────────────────────────────────────────────────────────

function extractDeviceId(req: AuthRequest): string | null {
  return (
    (req.headers['x-device-id'] as string) ||
    (req.query.deviceId as string) ||
    (req.body?.deviceId as string) ||
    null
  );
}

function buildTeamTag(teamId: string): string {
  return `team:${teamId}`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/events/:eventId/face-off/config
 * Returns the face-off configuration for an event (teams, contest status).
 */
router.get('/:eventId/face-off/config', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true, featuresConfig: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const config = (event.featuresConfig as any)?.faceOff || {};
    const teams: { id: string; name: string; color: string; emoji: string }[] = config.teams || [
      { id: 'red', name: 'Team Rot', color: '#EF4444', emoji: '🔴' },
      { id: 'blue', name: 'Team Blau', color: '#3B82F6', emoji: '🔵' },
    ];
    const enabled: boolean = config.enabled !== false;

    res.json({ enabled, teams, eventId });
  } catch (error) {
    logger.error('[FaceOff] Config error', { error: (error as Error).message });
    res.status(500).json({ error: 'Face-Off Konfiguration nicht verfügbar' });
  }
});

/**
 * POST /api/events/:eventId/face-off/join
 * Assign the current device to a team (or get existing assignment).
 */
router.post('/:eventId/face-off/join', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { teamId } = req.body;
    const deviceId = extractDeviceId(req);

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId erforderlich (x-device-id Header)' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true, featuresConfig: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const config = (event.featuresConfig as any)?.faceOff || {};
    if (config.enabled === false) {
      return res.status(403).json({ error: 'Face-Off ist für dieses Event deaktiviert' });
    }

    const teams: { id: string; name: string; color: string; emoji: string }[] = config.teams || [
      { id: 'red', name: 'Team Rot', color: '#EF4444', emoji: '🔴' },
      { id: 'blue', name: 'Team Blau', color: '#3B82F6', emoji: '🔵' },
    ];

    const key = getAssignmentKey(eventId, deviceId);
    const existing = teamAssignments.get(key);

    // If already assigned, return existing assignment
    if (existing && Date.now() - existing.assignedAt < TTL_MS) {
      const team = teams.find(t => t.id === existing.teamId) || teams[0];
      return res.json({ teamId: existing.teamId, teamName: existing.teamName, team, alreadyAssigned: true });
    }

    // Assign to requested team, or auto-assign to smallest team
    let assignedTeamId = teamId;
    if (!assignedTeamId || !teams.find(t => t.id === assignedTeamId)) {
      // Auto-balance: assign to team with fewest members
      const teamCounts = new Map<string, number>();
      for (const t of teams) teamCounts.set(t.id, 0);
      for (const [, a] of teamAssignments.entries()) {
        if (a.eventId === eventId) {
          teamCounts.set(a.teamId, (teamCounts.get(a.teamId) || 0) + 1);
        }
      }
      assignedTeamId = [...teamCounts.entries()]
        .sort(([, a], [, b]) => a - b)[0][0];
    }

    const team = teams.find(t => t.id === assignedTeamId) || teams[0];
    const assignment: TeamAssignment = {
      teamId: team.id,
      teamName: team.name,
      deviceId,
      eventId,
      assignedAt: Date.now(),
    };
    teamAssignments.set(key, assignment);

    logger.info('[FaceOff] Guest joined team', { eventId, deviceId: deviceId.slice(0, 8), teamId: team.id });

    res.json({ teamId: team.id, teamName: team.name, team, alreadyAssigned: false });
  } catch (error) {
    logger.error('[FaceOff] Join error', { error: (error as Error).message });
    res.status(500).json({ error: 'Team-Beitritt fehlgeschlagen' });
  }
});

/**
 * GET /api/events/:eventId/face-off/my-team
 * Get the current device's team assignment.
 */
router.get('/:eventId/face-off/my-team', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const deviceId = extractDeviceId(req);

    if (!deviceId) {
      return res.json({ assigned: false });
    }

    const key = getAssignmentKey(eventId, deviceId);
    const assignment = teamAssignments.get(key);

    if (!assignment || Date.now() - assignment.assignedAt > TTL_MS) {
      return res.json({ assigned: false });
    }

    res.json({ assigned: true, teamId: assignment.teamId, teamName: assignment.teamName });
  } catch (error) {
    res.status(500).json({ error: 'Team-Abfrage fehlgeschlagen' });
  }
});

/**
 * GET /api/events/:eventId/face-off/leaderboard
 * Returns photo counts per team (live).
 */
router.get('/:eventId/face-off/leaderboard', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true, featuresConfig: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const config = (event.featuresConfig as any)?.faceOff || {};
    const teams: { id: string; name: string; color: string; emoji: string }[] = config.teams || [
      { id: 'red', name: 'Team Rot', color: '#EF4444', emoji: '🔴' },
      { id: 'blue', name: 'Team Blau', color: '#3B82F6', emoji: '🔵' },
    ];

    // Count photos per team using tags
    const leaderboard = await Promise.all(teams.map(async (team) => {
      const tag = buildTeamTag(team.id);
      const count = await prisma.photo.count({
        where: {
          eventId,
          deletedAt: null,
          status: 'APPROVED',
          tags: { has: tag },
        },
      });
      return { ...team, photoCount: count };
    }));

    // Sort by photo count (descending)
    leaderboard.sort((a, b) => b.photoCount - a.photoCount);

    const totalPhotos = leaderboard.reduce((sum, t) => sum + t.photoCount, 0);
    const leader = leaderboard[0];

    res.json({
      teams: leaderboard,
      totalPhotos,
      leader: leader?.photoCount > 0 ? leader : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[FaceOff] Leaderboard error', { error: (error as Error).message });
    res.status(500).json({ error: 'Leaderboard nicht verfügbar' });
  }
});

/**
 * Export the team assignment lookup for use in other routes (e.g. uploads.ts).
 */
export function getTeamForDevice(eventId: string, deviceId: string): string | null {
  const key = getAssignmentKey(eventId, deviceId);
  const assignment = teamAssignments.get(key);
  if (!assignment || Date.now() - assignment.assignedAt > TTL_MS) return null;
  return assignment.teamId;
}

export default router;
