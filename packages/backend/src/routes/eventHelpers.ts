import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, isPrivilegedRole, hasEventPermission } from '../middleware/auth';

export async function requireHostOrAdmin(req: AuthRequest, res: Response, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true, deletedAt: true, isActive: true, designConfig: true },
  });

  if (!event || event.deletedAt || event.isActive === false) {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return null;
  }

  const hasManageAccess =
    (!!req.userId && event.hostId === req.userId) ||
    isPrivilegedRole(req.userRole) ||
    (!!req.userId &&
      !!(await prisma.eventMember.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: req.userId,
          },
        },
        select: { id: true },
      })));

  if (!hasManageAccess) {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return null;
  }

  return event;
}

export async function requireEventEditAccess(req: AuthRequest, res: Response, eventId: string) {
  const event = await requireHostOrAdmin(req, res, eventId);
  if (!event) return null;

  if (req.userId && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
    const canEdit = await hasEventPermission(req, eventId, 'canEditEvent');
    if (!canEdit) {
      res.status(404).json({ error: 'Event nicht gefunden' });
      return null;
    }
  }

  return event;
}
