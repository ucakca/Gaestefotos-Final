import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, optionalAuthMiddleware, hasEventManageAccess, hasEventAccess } from '../middleware/auth';
import { serializeBigInt } from '../utils/serializers';
import { logger } from '../utils/logger';
import { statsRoute, statsRouteWithReq, publicStatsRoute } from './photoStatsHelpers';
const router = Router();


statsRoute(router, 'ratings', 'Ratings aggregate', async (eventId) => {
  const votes = await (prisma as any).photoVote.groupBy({
    by: ['photoId'],
    where: { eventId },
    _avg: { rating: true },
    _count: { rating: true },
    orderBy: { _avg: { rating: 'desc' } },
    take: 50,
  });
  return { ratings: votes.map((v: any) => ({ photoId: v.photoId, avgRating: v._avg.rating || 0, voteCount: v._count.rating })) };
});


// GET /api/events/:eventId/photos/category-like-total — Total likes per category sorted desc
statsRoute(router, 'category-like-total', 'Category like total', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null } },
    _count: { id: true },
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, categoryId: true },
  }) : [];

  const catMap: Record<string, number> = {};
  for (const g of grouped as any[]) {
    const photo = photos.find((p) => p.id === g.photoId);
    if (photo?.categoryId) {
      catMap[photo.categoryId] = (catMap[photo.categoryId] || 0) + g._count.id;
    }
  }

  const catIds = Object.keys(catMap);
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const result = Object.entries(catMap)
    .map(([catId, total]) => ({
      categoryId: catId,
      categoryName: categories.find((c) => c.id === catId)?.name || null,
      likeCount: total,
    }))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 20);
  return { categories: result };
});


// GET /api/events/:eventId/photos/top-viewed-approved — Top20 approved photos by view count
statsRoute(router, 'top-viewed-approved', 'Top viewed approved', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, status: 'APPROVED' },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, uploadedBy: true },
    orderBy: { views: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/guest-like-rank — Top20 guests by like count given
statsRoute(router, 'guest-like-rank', 'Guest like rank', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['guestId'],
    where: { photo: { eventId, deletedAt: null }, guestId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const result = (grouped as any[]).map((g, i) => ({
    rank: i + 1,
    guestId: g.guestId,
    likeCount: g._count.id,
  }));
  return { guests: result };
});


// GET /api/events/:eventId/photos/top-commented-approved — Top20 approved photos by comment count
statsRoute(router, 'top-commented-approved', 'Top commented approved', async (eventId) => {
  const grouped = await prisma.photoComment.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null, status: 'APPROVED' } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    commentCount: g._count.id,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/upload-trend-weekly — Weekly upload counts for last 12 weeks
statsRoute(router, 'upload-trend-weekly', 'Upload trend weekly', async (eventId) => {
  const since = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const weekMap: Record<string, number> = {};
  for (const p of photos) {
    const d = p.createdAt;
    const startOfWeek = new Date(d);
    startOfWeek.setUTCDate(d.getUTCDate() - d.getUTCDay());
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const key = startOfWeek.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] || 0) + 1;
  }

  const weeks = Object.keys(weekMap).sort();
  const result = weeks.map((w) => ({ weekStart: w, count: weekMap[w] }));
  return { weeks: result, total: photos.length };
});


// GET /api/events/:eventId/photos/guest-vote-rank — Top20 guests by vote count
statsRoute(router, 'guest-vote-rank', 'Guest vote rank', async (eventId) => {
  const grouped = await prisma.photoVote.groupBy({
    by: ['guestId'],
    where: { photo: { eventId, deletedAt: null }, guestId: { not: null } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const result = (grouped as any[]).map((g, i) => ({
    rank: i + 1,
    guestId: g.guestId,
    voteCount: g._count.id,
    avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
  }));
  return { guests: result };
});


// GET /api/events/:eventId/photos/top-voted-approved — Top20 approved photos by vote count
statsRoute(router, 'top-voted-approved', 'Top voted approved', async (eventId) => {
  const grouped = await prisma.photoVote.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null, status: 'APPROVED' } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    voteCount: g._count.id,
    avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/guest-comment-rank — Top20 guests by comment count
statsRoute(router, 'guest-comment-rank', 'Guest comment rank', async (eventId) => {
  const grouped = await prisma.photoComment.groupBy({
    by: ['guestId'],
    where: { photo: { eventId, deletedAt: null }, guestId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const result = (grouped as any[]).map((g, i) => ({
    rank: i + 1,
    guestId: g.guestId,
    commentCount: g._count.id,
  }));
  return { guests: result };
});


// GET /api/events/:eventId/photos/count-by-status — Photo count and avg quality per status
statsRoute(router, 'count-by-status', 'Count by status', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['status'],
    where: { eventId, deletedAt: null },
    _count: { id: true },
    _avg: { qualityScore: true },
    _sum: { views: true },
  });

  const total = (grouped as any[]).reduce((acc, g) => acc + g._count.id, 0);

  const result = (grouped as any[]).map((g) => ({
    status: g.status,
    photoCount: g._count.id,
    pct: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
    avgQuality: g._avg.qualityScore ? Math.round(g._avg.qualityScore * 10) / 10 : null,
    totalViews: g._sum.views || 0,
  }));
  return { stats: result, total };
});


// GET /api/events/:eventId/photos/approved-by-uploader — Approved photo count per uploader
statsRoute(router, 'approved-by-uploader', 'Approved by uploader', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['uploadedBy'],
    where: { eventId, deletedAt: null, status: 'APPROVED', uploadedBy: { not: null } },
    _count: { id: true },
    _avg: { qualityScore: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const userIds = (grouped as any[]).map((g) => g.uploadedBy).filter(Boolean) as string[];
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    uploadedBy: g.uploadedBy,
    name: users.find((u) => u.id === g.uploadedBy)?.name || null,
    approvedCount: g._count.id,
    avgQuality: g._avg.qualityScore ? Math.round(g._avg.qualityScore * 10) / 10 : null,
  }));
  return { uploaders: result };
});


// GET /api/events/:eventId/photos/top-liked-approved — Top20 approved photos by like count
statsRoute(router, 'top-liked-approved', 'Top liked approved', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null, status: 'APPROVED' } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    likeCount: g._count.id,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/upload-trend-monthly — Monthly upload counts for last 12 months
statsRoute(router, 'upload-trend-monthly', 'Upload trend monthly', async (eventId) => {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const monthMap: Record<string, number> = {};
  for (const p of photos) {
    const key = `${p.createdAt.getUTCFullYear()}-${String(p.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  }

  const months = Object.keys(monthMap).sort();
  const result = months.map((m) => ({ month: m, count: monthMap[m] }));
  return { months: result, total: photos.length };
});


// GET /api/events/:eventId/photos/vote-velocity — Top20 photos by votes-per-day since upload
statsRoute(router, 'vote-velocity', 'Vote velocity', async (eventId) => {
  const grouped = await prisma.photoVote.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true, createdAt: true },
  }) : [];

  const now = Date.now();
  const result = (grouped as any[]).map((g) => {
    const photo = photos.find((p) => p.id === g.photoId);
    const ageDays = photo ? Math.max((now - photo.createdAt.getTime()) / 86_400_000, 0.01) : 1;
    const velocity = Math.round((g._count.id / ageDays) * 100) / 100;
    return {
      ...(photo || {}),
      voteCount: g._count.id,
      avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
      ageDays: Math.round(ageDays * 10) / 10,
      velocity,
    };
  }).sort((a, b) => b.velocity - a.velocity).slice(0, 20);
  return { photos: result };
});


// GET /api/events/:eventId/photos/top-quality-this-week — Top20 highest quality photos uploaded this week
statsRoute(router, 'top-quality-this-week', 'Top quality this week', async (eventId) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, createdAt: { gte: since }, qualityScore: { not: null } },
    select: { id: true, url: true, title: true, qualityScore: true, status: true, views: true, uploadedBy: true, createdAt: true },
    orderBy: { qualityScore: 'desc' },
    take: 20,
  });
  return { photos, since: since.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/rejected-by-category — Rejected photo count per category
statsRoute(router, 'rejected-by-category', 'Rejected by category', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['categoryId'],
    where: { eventId, deletedAt: null, status: 'REJECTED' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const catIds = (grouped as any[]).map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const totalGrouped = await prisma.photo.groupBy({
    by: ['categoryId'],
    where: { eventId, deletedAt: null, categoryId: { in: catIds } },
    _count: { id: true },
  });

  const result = (grouped as any[]).map((g) => {
    const total = (totalGrouped as any[]).find((t) => t.categoryId === g.categoryId)?._count.id || 0;
    return {
      categoryId: g.categoryId,
      categoryName: categories.find((c) => c.id === g.categoryId)?.name || null,
      rejectedCount: g._count.id,
      totalCount: total,
      rejectionRate: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
    };
  });
  return { categories: result };
});


// GET /api/events/:eventId/photos/comment-velocity — Top20 photos by comments-per-day since upload
statsRoute(router, 'comment-velocity', 'Comment velocity', async (eventId) => {
  const grouped = await prisma.photoComment.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true, createdAt: true },
  }) : [];

  const now = Date.now();
  const result = (grouped as any[]).map((g) => {
    const photo = photos.find((p) => p.id === g.photoId);
    const ageDays = photo ? Math.max((now - photo.createdAt.getTime()) / 86_400_000, 0.01) : 1;
    const velocity = Math.round((g._count.id / ageDays) * 100) / 100;
    return { ...(photo || {}), commentCount: g._count.id, ageDays: Math.round(ageDays * 10) / 10, velocity };
  }).sort((a, b) => b.velocity - a.velocity).slice(0, 20);
  return { photos: result };
});


// GET /api/events/:eventId/photos/top-quality-today — Top10 photos by quality score uploaded today
statsRoute(router, 'top-quality-today', 'Top quality today', async (eventId) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, createdAt: { gte: startOfDay }, qualityScore: { not: null } },
    select: { id: true, url: true, title: true, qualityScore: true, status: true, views: true, uploadedBy: true },
    orderBy: { qualityScore: 'desc' },
    take: 10,
  });
  return { photos, date: startOfDay.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/upload-hour-distribution — Upload count per UTC hour (0-23)
statsRoute(router, 'upload-hour-distribution', 'Upload hour distribution', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const counts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  for (const p of photos) {
    counts[p.createdAt.getUTCHours()].count++;
  }

  const total = photos.length;
  const result = counts.map((c) => ({
    ...c,
    pct: total > 0 ? Math.round((c.count / total) * 100) : 0,
  }));
  return { hours: result, total };
});


// GET /api/events/:eventId/photos/top-commented-this-week — Top20 photos by comments in last 7 days
statsRoute(router, 'top-commented-this-week', 'Top commented this week', async (eventId) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.photoComment.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null }, createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    commentsThisWeek: g._count.id,
  }));
  return { photos: result, since: since.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/upload-by-weekday — Upload count per weekday (0=Sun to 6=Sat)
statsRoute(router, 'upload-by-weekday', 'Upload by weekday', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const p of photos) {
    counts[p.createdAt.getUTCDay()]++;
  }

  const result = days.map((name, i) => ({
    weekday: i,
    name,
    count: counts[i],
    pct: photos.length > 0 ? Math.round((counts[i] / photos.length) * 100) : 0,
  }));
  return { weekdays: result, total: photos.length };
});


// GET /api/events/:eventId/photos/like-velocity — Top20 photos by likes-per-day since upload
statsRoute(router, 'like-velocity', 'Like velocity', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true, createdAt: true },
  }) : [];

  const now = Date.now();
  const result = (grouped as any[]).map((g) => {
    const photo = photos.find((p) => p.id === g.photoId);
    const ageDays = photo ? Math.max((now - photo.createdAt.getTime()) / 86_400_000, 0.01) : 1;
    const velocity = Math.round((g._count.id / ageDays) * 100) / 100;
    return { ...(photo || {}), likeCount: g._count.id, ageDays: Math.round(ageDays * 10) / 10, velocity };
  }).sort((a, b) => b.velocity - a.velocity).slice(0, 20);
  return { photos: result };
});


// GET /api/events/:eventId/photos/pending-oldest — Top20 PENDING photos waiting longest for review
statsRoute(router, 'pending-oldest', 'Pending oldest', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, status: 'PENDING' },
    select: { id: true, url: true, title: true, createdAt: true, uploadedBy: true, guestId: true, qualityScore: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const now = Date.now();
  const result = photos.map((p) => ({
    ...p,
    waitingHours: Math.round((now - p.createdAt.getTime()) / 3_600_000 * 10) / 10,
  }));
  return { photos: result, total: result.length };
});


// GET /api/events/:eventId/photos/top-liked-no-views — Top20 liked photos with zero views (hidden gems)
statsRoute(router, 'top-liked-no-views', 'Top liked no views', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null, views: 0 } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, status: true, qualityScore: true, views: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    likeCount: g._count.id,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/category-vote-leader — Top20 categories by total vote count
statsRoute(router, 'category-vote-leader', 'Category vote leader', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, categoryId: { not: null } },
    select: {
      categoryId: true,
      _count: { select: { votes: true } },
    },
  });

  const catMap: Record<string, { votes: number }> = {};
  for (const p of photos) {
    const cid = p.categoryId as string;
    if (!catMap[cid]) catMap[cid] = { votes: 0 };
    catMap[cid].votes += p._count.votes;
  }

  const catIds = Object.keys(catMap);
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const result = Object.entries(catMap)
    .map(([cid, d]) => ({
      categoryId: cid,
      categoryName: categories.find((c) => c.id === cid)?.name || null,
      voteCount: d.votes,
    }))
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 20);
  return { categories: result };
});


// GET /api/events/:eventId/photos/top-voted-this-week — Top20 photos by votes cast in last 7 days
statsRoute(router, 'top-voted-this-week', 'Top voted this week', async (eventId) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.photoVote.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null }, createdAt: { gte: since } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    votesThisWeek: g._count.id,
    avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
  }));
  return { photos: result, since: since.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/category-view-total — Total views per category sorted desc
statsRoute(router, 'category-view-total', 'Category view total', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['categoryId'],
    where: { eventId, deletedAt: null },
    _sum: { views: true },
    _count: { id: true },
    orderBy: { _sum: { views: 'desc' } },
    take: 20,
  });

  const catIds = (grouped as any[]).map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const stats = (grouped as any[]).map((g) => ({
    categoryId: g.categoryId,
    categoryName: categories.find((c) => c.id === g.categoryId)?.name || null,
    photoCount: g._count.id,
    totalViews: g._sum.views || 0,
    avgViews: g._count.id > 0 ? Math.round((g._sum.views || 0) / g._count.id) : 0,
  }));
  return { stats };
});


// GET /api/events/:eventId/photos/uploader-quality-avg — Top20 uploaders by avg quality score
statsRoute(router, 'uploader-quality-avg', 'Uploader quality avg', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['uploadedBy'],
    where: { eventId, deletedAt: null, uploadedBy: { not: null }, qualityScore: { not: null } },
    _avg: { qualityScore: true },
    _count: { id: true },
    having: { qualityScore: { _count: { gte: 2 } } },
    orderBy: { _avg: { qualityScore: 'desc' } },
    take: 20,
  });

  const userIds = (grouped as any[]).map((g) => g.uploadedBy).filter(Boolean) as string[];
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    uploadedBy: g.uploadedBy,
    name: users.find((u) => u.id === g.uploadedBy)?.name || null,
    photoCount: g._count.id,
    avgQuality: Math.round((g._avg.qualityScore || 0) * 10) / 10,
  }));
  return { uploaders: result };
});


// GET /api/events/:eventId/photos/top-viewed-this-week — Top20 most viewed photos in last 7 days
statsRoute(router, 'top-viewed-this-week', 'Top viewed this week', async (eventId) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, updatedAt: { gte: since }, views: { gt: 0 } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, status: true, uploadedBy: true },
    orderBy: { views: 'desc' },
    take: 20,
  });
  return { photos, since: since.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/guest-upload-rank — All guests ranked by upload count
statsRoute(router, 'guest-upload-rank', 'Guest upload rank', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['guestId'],
    where: { eventId, deletedAt: null, guestId: { not: null } },
    _count: { id: true },
    _avg: { qualityScore: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  });

  const result = (grouped as any[]).map((g, i) => ({
    rank: i + 1,
    guestId: g.guestId,
    uploadCount: g._count.id,
    avgQuality: g._avg.qualityScore ? Math.round(g._avg.qualityScore * 10) / 10 : null,
  }));
  return { guests: result };
});


// GET /api/events/:eventId/photos/photo-age-distribution — Photos grouped by age in days (<1/1-7/7-30/30-90/90+)
statsRoute(router, 'photo-age-distribution', 'Photo age distribution', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true, status: true },
  });

  const now = Date.now();
  const buckets = [
    { label: '<1 day', max: 1, count: 0, approved: 0 },
    { label: '1-7 days', max: 7, count: 0, approved: 0 },
    { label: '7-30 days', max: 30, count: 0, approved: 0 },
    { label: '30-90 days', max: 90, count: 0, approved: 0 },
    { label: '90+ days', max: Infinity, count: 0, approved: 0 },
  ];

  for (const p of photos) {
    const ageDays = (now - p.createdAt.getTime()) / 86_400_000;
    let prev = 0;
    for (const b of buckets) {
      if (ageDays < b.max && ageDays >= prev) {
        b.count++;
        if (p.status === 'APPROVED') b.approved++;
        break;
      }
      prev = b.max === Infinity ? b.max : b.max;
    }
  }

  const total = photos.length;
  const result = buckets.map((b) => ({
    label: b.label,
    count: b.count,
    approved: b.approved,
    pct: total > 0 ? Math.round((b.count / total) * 100) : 0,
  }));
  return { buckets: result, total };
});


// GET /api/events/:eventId/photos/quality-tier-breakdown — Photo count per quality tier (0-25/26-50/51-75/76-100)
statsRoute(router, 'quality-tier-breakdown', 'Quality tier breakdown', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, qualityScore: { not: null } },
    select: { qualityScore: true, status: true },
  });

  const tiers = [
    { label: 'Low (0-25)', min: 0, max: 25, count: 0, approved: 0 },
    { label: 'Medium (26-50)', min: 26, max: 50, count: 0, approved: 0 },
    { label: 'Good (51-75)', min: 51, max: 75, count: 0, approved: 0 },
    { label: 'Excellent (76-100)', min: 76, max: 100, count: 0, approved: 0 },
  ];

  for (const p of photos) {
    const q = p.qualityScore as number;
    const tier = tiers.find((t) => q >= t.min && q <= t.max);
    if (tier) {
      tier.count++;
      if (p.status === 'APPROVED') tier.approved++;
    }
  }

  const total = photos.length;
  const result = tiers.map((t) => ({
    ...t,
    pct: total > 0 ? Math.round((t.count / total) * 100) : 0,
    approvalRate: t.count > 0 ? Math.round((t.approved / t.count) * 100) : 0,
  }));
  return { tiers: result, total };
});


// GET /api/events/:eventId/photos/top-liked-this-week — Top20 photos by likes in last 7 days
statsRoute(router, 'top-liked-this-week', 'Top liked this week', async (eventId) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null }, createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, status: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    likesThisWeek: g._count.id,
  }));
  return { photos: result, since: since.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/category-comment-leader — Top20 categories by total comment count
statsRoute(router, 'category-comment-leader', 'Category comment leader', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, categoryId: { not: null } },
    select: {
      categoryId: true,
      _count: { select: { comments: true } },
    },
  });

  const catMap: Record<string, number> = {};
  for (const p of photos) {
    const cid = p.categoryId as string;
    catMap[cid] = (catMap[cid] || 0) + p._count.comments;
  }

  const catIds = Object.keys(catMap);
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const result = Object.entries(catMap)
    .map(([cid, commentCount]) => ({
      categoryId: cid,
      categoryName: categories.find((c) => c.id === cid)?.name || null,
      commentCount,
    }))
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 20);
  return { categories: result };
});


// GET /api/events/:eventId/photos/top-voted-today — Top10 photos by votes cast today
statsRoute(router, 'top-voted-today', 'Top voted today', async (eventId) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const grouped = await prisma.photoVote.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null }, createdAt: { gte: startOfDay } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    votesToday: g._count.id,
    avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
  }));
  return { photos: result, date: startOfDay.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/cumulative-upload-trend — Cumulative upload count per day
statsRoute(router, 'cumulative-upload-trend', 'Cumulative upload trend', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const dayMap: Record<string, number> = {};
  for (const p of photos) {
    const day = p.createdAt.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  }

  let cumulative = 0;
  const trend = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      cumulative += count;
      return { date, dailyCount: count, cumulative };
    });
  return { trend, total: cumulative };
});


// GET /api/events/:eventId/photos/approval-funnel — Full approval funnel: uploaded → pending → approved → liked
statsRoute(router, 'approval-funnel', 'Approval funnel', async (eventId) => {
  const [total, pending, approved, rejected, likedPhotos] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' } }),
    prisma.photoLike.groupBy({ by: ['photoId'], where: { photo: { eventId } }, orderBy: { photoId: 'asc' }, take: 10000 }),
  ]);

  const photosWithLikes = (likedPhotos as unknown as any[]).length;

  const funnel = [
    { stage: 'Uploaded', count: total, pct: 100 },
    { stage: 'Pending Review', count: pending, pct: total > 0 ? Math.round((pending / total) * 100) : 0 },
    { stage: 'Approved', count: approved, pct: total > 0 ? Math.round((approved / total) * 100) : 0 },
    { stage: 'Rejected', count: rejected, pct: total > 0 ? Math.round((rejected / total) * 100) : 0 },
    { stage: 'Received a Like', count: photosWithLikes, pct: approved > 0 ? Math.round((photosWithLikes / approved) * 100) : 0 },
  ];
  return { funnel };
});


// GET /api/events/:eventId/photos/top-commented-today — Top10 photos by comments added today
statsRoute(router, 'top-commented-today', 'Top commented today', async (eventId) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const grouped = await prisma.photoComment.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null }, createdAt: { gte: startOfDay } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, status: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    commentsToday: g._count.id,
  }));
  return { photos: result, date: startOfDay.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/category-size-total — Total file size per category in MB
statsRoute(router, 'category-size-total', 'Category size total', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['categoryId'],
    where: { eventId, deletedAt: null, sizeBytes: { not: null } },
    _sum: { sizeBytes: true },
    _count: { id: true },
    orderBy: { _sum: { sizeBytes: 'desc' } },
    take: 20,
  });

  const catIds = (grouped as any[]).map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const stats = (grouped as any[]).map((g) => ({
    categoryId: g.categoryId,
    categoryName: categories.find((c) => c.id === g.categoryId)?.name || null,
    photoCount: g._count.id,
    totalBytes: Number(g._sum.sizeBytes || 0),
    totalMB: Math.round(Number(g._sum.sizeBytes || 0) / 1_048_576 * 100) / 100,
  }));
  return { stats };
});


// GET /api/events/:eventId/photos/guest-engagement-score — Top20 guests by combined engagement (likes+comments+votes on their photos)
statsRoute(router, 'guest-engagement-score', 'Guest engagement score', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, guestId: { not: null } },
    select: {
      guestId: true,
      _count: { select: { likes: true, comments: true, votes: true } },
      views: true,
    },
  });

  const guestMap: Record<string, { likes: number; comments: number; votes: number; views: number; photos: number }> = {};
  for (const p of photos) {
    const gid = p.guestId as string;
    if (!guestMap[gid]) guestMap[gid] = { likes: 0, comments: 0, votes: 0, views: 0, photos: 0 };
    guestMap[gid].photos++;
    guestMap[gid].likes += p._count.likes;
    guestMap[gid].comments += p._count.comments;
    guestMap[gid].votes += p._count.votes;
    guestMap[gid].views += p.views;
  }

  const result = Object.entries(guestMap)
    .map(([guestId, d]) => ({
      guestId,
      ...d,
      score: d.likes * 3 + d.comments * 2 + d.votes + Math.floor(d.views / 10),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  return { guests: result };
});


// GET /api/events/:eventId/photos/comment-per-photo-avg — Avg comments per photo overall + per category
router.get('/:eventId/photos/comment-per-photo-avg', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [totalPhotos, totalComments] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photoComment.count({ where: { photo: { eventId } } }),
    ]);

    const grouped = await prisma.photo.groupBy({
      by: ['categoryId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
    });

    const catIds = (grouped as any[]).map((g) => g.categoryId).filter(Boolean) as string[];
    const [categories, commentsByCat] = await Promise.all([
      catIds.length > 0 ? prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } }) : [],
      prisma.photoComment.groupBy({
        by: ['photoId'],
        where: { photo: { eventId, categoryId: { not: null } } },
        _count: { id: true },
      }),
    ]);

    const photosByCat: Record<string, { photoCount: number; commentCount: number; name: string | null }> = {};
    for (const g of grouped as any[]) {
      const cid = g.categoryId || '__none__';
      photosByCat[cid] = { photoCount: g._count.id, commentCount: 0, name: categories.find((c) => c.id === cid)?.name || null };
    }

    const stats = Object.entries(photosByCat).map(([cid, d]) => ({
      categoryId: cid === '__none__' ? null : cid,
      categoryName: d.name,
      photoCount: d.photoCount,
      avgComments: totalPhotos > 0 ? Math.round((d.commentCount / d.photoCount) * 100) / 100 : 0,
    })).sort((a, b) => b.avgComments - a.avgComments);

    res.json({
      overall: { totalPhotos, totalComments, avgCommentsPerPhoto: totalPhotos > 0 ? Math.round((totalComments / totalPhotos) * 100) / 100 : 0 },
      byCategory: stats,
    });
  } catch (error: any) {
    logger.error('Comment per photo avg error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/top-liked-guest-photos — Top20 photos uploaded by guests by like count
statsRoute(router, 'top-liked-guest-photos', 'Top liked guest photos', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, guestId: { not: null }, deletedAt: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, status: true, guestId: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    likeCount: g._count.id,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/upload-spike — Days where uploads exceed 2x the daily average
statsRoute(router, 'upload-spike', 'Upload spike', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const dayMap: Record<string, number> = {};
  for (const p of photos) {
    const day = p.createdAt.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  }

  const days = Object.entries(dayMap);
  const totalDays = days.length;
  if (totalDays === 0) return { spikeDays: [], avgPerDay: 0, total: 0 };

  const avgPerDay = photos.length / totalDays;
  const threshold = avgPerDay * 2;
  const spikeDays = days
    .filter(([, count]) => count >= threshold)
    .map(([date, count]) => ({ date, count, xAvg: Math.round((count / avgPerDay) * 10) / 10 }))
    .sort((a, b) => b.count - a.count);
  return { spikeDays, avgPerDay: Math.round(avgPerDay * 10) / 10, threshold: Math.round(threshold * 10) / 10, total: photos.length };
});


// GET /api/events/:eventId/photos/top-viewed-today — Top10 photos by views gained today
statsRoute(router, 'top-viewed-today', 'Top viewed today', async (eventId) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, updatedAt: { gte: startOfDay }, views: { gt: 0 } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, status: true },
    orderBy: { views: 'desc' },
    take: 10,
  });
  return { photos, date: startOfDay.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/storage-by-status — Total storage bytes per status
statsRoute(router, 'storage-by-status', 'Storage by status', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['status'],
    where: { eventId, deletedAt: null, sizeBytes: { not: null } },
    _sum: { sizeBytes: true },
    _count: { id: true },
  });

  const stats = (grouped as any[]).map((g) => ({
    status: g.status,
    photoCount: g._count.id,
    totalBytes: Number(g._sum.sizeBytes || 0),
    totalMB: Math.round(Number(g._sum.sizeBytes || 0) / 1_048_576 * 100) / 100,
  })).sort((a, b) => b.totalBytes - a.totalBytes);

  const totalBytes = stats.reduce((s, g) => s + g.totalBytes, 0);
  return { stats, totalBytes, totalMB: Math.round(totalBytes / 1_048_576 * 100) / 100 };
});


// GET /api/events/:eventId/photos/vote-score-distribution — Distribution of vote scores 1-5
statsRoute(router, 'vote-score-distribution', 'Vote score distribution', async (eventId) => {
  const grouped = await prisma.photoVote.groupBy({
    by: ['rating'],
    where: { photo: { eventId } },
    _count: { id: true },
    orderBy: { rating: 'asc' },
  });

  const total = (grouped as any[]).reduce((s: number, g: any) => s + g._count.id, 0);
  const distribution = (grouped as any[]).map((g) => ({
    rating: g.rating,
    count: g._count.id,
    pct: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
  }));

  const avgRating = total > 0
    ? Math.round((grouped as any[]).reduce((s: number, g: any) => s + g.rating * g._count.id, 0) / total * 100) / 100
    : null;
  return { distribution, total, avgRating };
});


// GET /api/events/:eventId/photos/uploader-activity-heatmap — Upload count per weekday+hour grid
statsRoute(router, 'uploader-activity-heatmap', 'Uploader activity heatmap', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const p of photos) {
    const wd = p.createdAt.getUTCDay();
    const hr = p.createdAt.getUTCHours();
    grid[wd][hr]++;
  }

  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const heatmap = grid.map((row, i) => ({ weekday: i, label: labels[i], hours: row }));
  return { heatmap, total: photos.length };
});


// GET /api/events/:eventId/photos/quality-vs-views — Quality score vs views scatter data (sample 200)
statsRoute(router, 'quality-vs-views', 'Quality vs views', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, qualityScore: { not: null } },
    select: { id: true, qualityScore: true, views: true, status: true },
    orderBy: { views: 'desc' },
    take: 200,
  });

  const scatter = photos.map((p) => ({ id: p.id, quality: p.qualityScore, views: p.views, status: p.status }));
  return { scatter, total: scatter.length };
});


// GET /api/events/:eventId/photos/top-liked-approved-today — Top10 approved photos liked today
statsRoute(router, 'top-liked-approved-today', 'Top liked approved today', async (eventId) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, status: 'APPROVED', deletedAt: null }, createdAt: { gte: startOfDay } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    likesToday: g._count.id,
  }));
  return { photos: result, date: startOfDay.toISOString().slice(0, 10) };
});


// GET /api/events/:eventId/photos/category-approval-rate — Approval rate per category
statsRoute(router, 'category-approval-rate', 'Category approval rate', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, categoryId: { not: null } },
    select: { categoryId: true, status: true },
  });

  const catMap: Record<string, { total: number; approved: number }> = {};
  for (const p of photos) {
    const cid = p.categoryId as string;
    if (!catMap[cid]) catMap[cid] = { total: 0, approved: 0 };
    catMap[cid].total++;
    if (p.status === 'APPROVED') catMap[cid].approved++;
  }

  const catIds = Object.keys(catMap);
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const stats = Object.entries(catMap)
    .map(([cid, d]) => ({
      categoryId: cid,
      categoryName: categories.find((c) => c.id === cid)?.name || null,
      total: d.total,
      approved: d.approved,
      approvalRate: Math.round((d.approved / d.total) * 100),
    }))
    .sort((a, b) => b.approvalRate - a.approvalRate);
  return { stats };
});


// GET /api/events/:eventId/photos/top-voted-rejected — Top20 REJECTED photos by vote count
statsRoute(router, 'top-voted-rejected', 'Top voted rejected', async (eventId) => {
  const grouped = await prisma.photoVote.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, status: 'REJECTED', deletedAt: null } },
    _count: { id: true },
    _avg: { rating: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, qualityScore: true, uploadedBy: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    voteCount: g._count.id,
    avgRating: Math.round((g._avg.rating || 0) * 10) / 10,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/monthly-summary — Photo/like/comment/vote totals per calendar month
statsRoute(router, 'monthly-summary', 'Monthly summary', async (eventId) => {
  const [photos, likes, comments, votes] = await Promise.all([
    prisma.photo.findMany({ where: { eventId, deletedAt: null }, select: { createdAt: true } }),
    prisma.photoLike.findMany({ where: { photo: { eventId } }, select: { createdAt: true } }),
    prisma.photoComment.findMany({ where: { photo: { eventId } }, select: { createdAt: true } }),
    prisma.photoVote.findMany({ where: { photo: { eventId } }, select: { createdAt: true } }),
  ]);

  const monthMap: Record<string, { photos: number; likes: number; comments: number; votes: number }> = {};
  const addTo = (arr: { createdAt: Date }[], key: 'photos' | 'likes' | 'comments' | 'votes') => {
    for (const item of arr) {
      const month = item.createdAt.toISOString().slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { photos: 0, likes: 0, comments: 0, votes: 0 };
      monthMap[month][key]++;
    }
  };
  addTo(photos, 'photos'); addTo(likes, 'likes'); addTo(comments, 'comments'); addTo(votes, 'votes');

  const months = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, ...d, total: d.photos + d.likes + d.comments + d.votes }));
  return { months };
});


// GET /api/events/:eventId/photos/top-stories — Top20 story-type photos by views
statsRoute(router, 'top-stories', 'Top stories', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, isStoryOnly: true },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, status: true, uploadedBy: true },
    orderBy: { views: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/rejection-rate-by-uploader — Top20 uploaders by rejection rate
statsRoute(router, 'rejection-rate-by-uploader', 'Rejection rate by uploader', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, uploadedBy: { not: null } },
    select: { uploadedBy: true, status: true },
  });

  const uploaderMap: Record<string, { total: number; rejected: number }> = {};
  for (const p of photos) {
    const uid = p.uploadedBy as string;
    if (!uploaderMap[uid]) uploaderMap[uid] = { total: 0, rejected: 0 };
    uploaderMap[uid].total++;
    if (p.status === 'REJECTED') uploaderMap[uid].rejected++;
  }

  const result = Object.entries(uploaderMap)
    .filter(([, d]) => d.total >= 2)
    .map(([uploadedBy, d]) => ({
      uploadedBy,
      total: d.total,
      rejected: d.rejected,
      rejectionRate: Math.round((d.rejected / d.total) * 100),
    }))
    .sort((a, b) => b.rejectionRate - a.rejectionRate)
    .slice(0, 20);
  return { uploaders: result };
});


// GET /api/events/:eventId/photos/view-per-like-ratio — Top20 photos by views-per-like ratio
statsRoute(router, 'view-per-like-ratio', 'View per like ratio', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null, views: { gt: 0 } } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 100,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true },
  }) : [];

  const result = (grouped as any[]).map((g) => {
    const p = photos.find((ph) => ph.id === g.photoId);
    const views = p?.views || 1;
    return { ...p, likeCount: g._count.id, viewPerLike: Math.round((views / g._count.id) * 10) / 10 };
  }).sort((a, b) => a.viewPerLike - b.viewPerLike).slice(0, 20);
  return { photos: result };
});


// GET /api/events/:eventId/photos/top-quality-unviewed — Top20 high-quality photos with 0 views
statsRoute(router, 'top-quality-unviewed', 'Top quality unviewed', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, views: 0, qualityScore: { not: null } },
    select: { id: true, url: true, title: true, qualityScore: true, status: true, uploadedBy: true },
    orderBy: { qualityScore: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/category-engagement — Likes+Comments sum per category
statsRoute(router, 'category-engagement', 'Category engagement', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, categoryId: { not: null } },
    select: {
      categoryId: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  const catMap: Record<string, { likes: number; comments: number; photos: number }> = {};
  for (const p of photos) {
    const cid = p.categoryId as string;
    if (!catMap[cid]) catMap[cid] = { likes: 0, comments: 0, photos: 0 };
    catMap[cid].photos++;
    catMap[cid].likes += p._count.likes;
    catMap[cid].comments += p._count.comments;
  }

  const catIds = Object.keys(catMap);
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const stats = Object.entries(catMap)
    .map(([cid, d]) => ({
      categoryId: cid,
      categoryName: categories.find((c) => c.id === cid)?.name || null,
      ...d,
      total: d.likes + d.comments,
    }))
    .sort((a, b) => b.total - a.total);
  return { stats };
});


// GET /api/events/:eventId/photos/size-bucket — Photo count per file size bucket (0-1MB, 1-5MB, 5-10MB, 10MB+)
statsRoute(router, 'size-bucket', 'Size bucket', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, sizeBytes: { not: null } },
    select: { sizeBytes: true },
  });

  const buckets = [
    { label: '0-1MB', min: 0, max: 1_000_000, count: 0 },
    { label: '1-5MB', min: 1_000_000, max: 5_000_000, count: 0 },
    { label: '5-10MB', min: 5_000_000, max: 10_000_000, count: 0 },
    { label: '10MB+', min: 10_000_000, max: Infinity, count: 0 },
  ];

  for (const p of photos) {
    const bytes = Number(p.sizeBytes);
    const bucket = buckets.find((b) => bytes >= b.min && bytes < b.max);
    if (bucket) bucket.count++;
  }

  const total = photos.length;
  const result = buckets.map((b) => ({ ...b, pct: total > 0 ? Math.round((b.count / total) * 100) : 0 }));
  return { total, buckets: result };
});


// GET /api/events/:eventId/photos/guest-upload-timeline — Photos uploaded per day per guest (top5 guests)
statsRoute(router, 'guest-upload-timeline', 'Guest upload timeline', async (eventId) => {
  const top5 = await prisma.photo.groupBy({
    by: ['guestId'],
    where: { eventId, deletedAt: null, guestId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  const guestIds = (top5 as any[]).map((g) => g.guestId) as string[];
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, guestId: { in: guestIds } },
    select: { createdAt: true, guestId: true },
  });

  const timeline: Record<string, Record<string, number>> = {};
  for (const p of photos) {
    const day = p.createdAt.toISOString().slice(0, 10);
    const gid = p.guestId as string;
    if (!timeline[day]) timeline[day] = {};
    timeline[day][gid] = (timeline[day][gid] || 0) + 1;
  }

  const days = Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
  return { guestIds, days };
});


// GET /api/events/:eventId/photos/quality-by-weekday — Avg quality per weekday
statsRoute(router, 'quality-by-weekday', 'Quality by weekday', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, qualityScore: { not: null } },
    select: { createdAt: true, qualityScore: true },
  });

  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days: { sum: number; count: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  for (const p of photos) {
    const d = p.createdAt.getUTCDay();
    days[d].sum += p.qualityScore as number;
    days[d].count++;
  }

  const result = days.map((d, i) => ({
    weekday: i,
    label: labels[i],
    count: d.count,
    avgQuality: d.count > 0 ? Math.round((d.sum / d.count) * 10) / 10 : null,
  }));
  return { weekdays: result };
});


// GET /api/events/:eventId/photos/oldest-unreviewed — Top20 oldest PENDING photos
statsRoute(router, 'oldest-unreviewed', 'Oldest unreviewed', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, status: 'PENDING' },
    select: { id: true, url: true, title: true, createdAt: true, qualityScore: true, uploadedBy: true, guestId: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const now = Date.now();
  const result = photos.map((p) => ({
    ...p,
    ageHours: Math.round((now - p.createdAt.getTime()) / 3_600_000 * 10) / 10,
  }));
  return { photos: result, total: result.length };
});


// GET /api/events/:eventId/photos/top-viewed-orphan — Top20 viewed photos without a category
statsRoute(router, 'top-viewed-orphan', 'Top viewed orphan', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, categoryId: null, views: { gt: 0 } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, status: true },
    orderBy: { views: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/comment-approval-rate — Approved vs rejected comment rates
statsRoute(router, 'comment-approval-rate', 'Comment approval rate', async (eventId) => {
  const grouped = await prisma.photoComment.groupBy({
    by: ['status'],
    where: { photo: { eventId } },
    _count: { id: true },
  });

  const total = (grouped as any[]).reduce((s: number, g: any) => s + g._count.id, 0);
  const breakdown = (grouped as any[]).map((g) => ({
    status: g.status,
    count: g._count.id,
    pct: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count);
  return { total, breakdown };
});


// GET /api/events/:eventId/photos/category-view-leader — Category with highest total views
statsRoute(router, 'category-view-leader', 'Category view leader', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['categoryId'],
    where: { eventId, deletedAt: null, categoryId: { not: null } },
    _sum: { views: true },
    _count: { id: true },
    orderBy: { _sum: { views: 'desc' } },
    take: 20,
  });

  const catIds = (grouped as any[]).map((g) => g.categoryId).filter(Boolean) as string[];
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const stats = (grouped as any[]).map((g) => ({
    categoryId: g.categoryId,
    categoryName: categories.find((c) => c.id === g.categoryId)?.name || null,
    photoCount: g._count.id,
    totalViews: g._sum.views || 0,
  }));
  return { stats };
});


// GET /api/events/:eventId/photos/gps-cluster — GPS cluster summary (count per 1-degree grid cell)
statsRoute(router, 'gps-cluster', 'GPS cluster', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, latitude: true, longitude: true },
  });

  const cellMap: Record<string, { lat: number; lng: number; count: number }> = {};
  for (const p of photos) {
    const cellLat = Math.floor(p.latitude!);
    const cellLng = Math.floor(p.longitude!);
    const key = `${cellLat}:${cellLng}`;
    if (!cellMap[key]) cellMap[key] = { lat: cellLat, lng: cellLng, count: 0 };
    cellMap[key].count++;
  }

  const clusters = Object.values(cellMap).sort((a, b) => b.count - a.count);
  return { total: photos.length, clusters };
});


// GET /api/events/:eventId/photos/top-rated-guests — Top20 guests by avg vote rating on their photos
statsRoute(router, 'top-rated-guests', 'Top rated guests', async (eventId) => {
  const votes = await prisma.photoVote.findMany({
    where: { photo: { eventId, deletedAt: null } },
    select: { rating: true, photo: { select: { guestId: true } } },
  });

  const guestMap: Record<string, { ratingSum: number; count: number }> = {};
  for (const v of votes) {
    const gid = v.photo.guestId;
    if (!gid) continue;
    if (!guestMap[gid]) guestMap[gid] = { ratingSum: 0, count: 0 };
    guestMap[gid].ratingSum += v.rating;
    guestMap[gid].count++;
  }

  const guests = Object.entries(guestMap)
    .map(([guestId, d]) => ({ guestId, voteCount: d.count, avgRating: Math.round((d.ratingSum / d.count) * 100) / 100 }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 20);
  return { guests };
});


// GET /api/events/:eventId/photos/approval-lag — Avg time (hours) between upload and APPROVED status change
router.get('/:eventId/photos/approval-lag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, status: 'APPROVED' },
      select: { createdAt: true, updatedAt: true },
    });

    if (photos.length === 0) return res.json({ total: 0, avgLagHours: null });

    const lags = photos.map((p) => (p.updatedAt.getTime() - p.createdAt.getTime()) / 3_600_000);
    const avgLag = lags.reduce((s, l) => s + l, 0) / lags.length;
    const minLag = Math.min(...lags);
    const maxLag = Math.max(...lags);

    res.json({
      total: photos.length,
      avgLagHours: Math.round(avgLag * 10) / 10,
      minLagHours: Math.round(minLag * 10) / 10,
      maxLagHours: Math.round(maxLag * 10) / 10,
    });
  } catch (error: any) {
    logger.error('Approval lag error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/status-breakdown — Photo count per status
statsRoute(router, 'status-breakdown', 'Status breakdown', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['status'],
    where: { eventId, deletedAt: null },
    _count: { id: true },
  });

  const total = (grouped as any[]).reduce((s: number, g: any) => s + g._count.id, 0);
  const breakdown = (grouped as any[]).map((g) => ({
    status: g.status,
    count: g._count.id,
    pct: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count);
  return { total, breakdown };
});


// GET /api/events/:eventId/photos/quality-gap — Avg quality diff between category with most vs least photos
router.get('/:eventId/photos/quality-gap', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['categoryId'],
      where: { eventId, deletedAt: null, qualityScore: { not: null }, categoryId: { not: null } },
      _avg: { qualityScore: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (grouped.length < 2) return res.json({ categories: grouped.length, gap: null });

    const sorted = (grouped as any[]).sort((a, b) => (b._avg.qualityScore || 0) - (a._avg.qualityScore || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const gap = Math.round(((best._avg.qualityScore || 0) - (worst._avg.qualityScore || 0)) * 10) / 10;

    res.json({
      categories: sorted.length,
      gap,
      bestCategoryId: best.categoryId,
      bestAvgQuality: Math.round((best._avg.qualityScore || 0) * 10) / 10,
      worstCategoryId: worst.categoryId,
      worstAvgQuality: Math.round((worst._avg.qualityScore || 0) * 10) / 10,
    });
  } catch (error: any) {
    logger.error('Quality gap error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/daily-engagement — Likes+Comments+Votes per day
statsRoute(router, 'daily-engagement', 'Daily engagement', async (eventId) => {
  const [likes, comments, votes] = await Promise.all([
    prisma.photoLike.findMany({ where: { photo: { eventId } }, select: { createdAt: true } }),
    prisma.photoComment.findMany({ where: { photo: { eventId } }, select: { createdAt: true } }),
    prisma.photoVote.findMany({ where: { photo: { eventId } }, select: { createdAt: true } }),
  ]);

  const dayMap: Record<string, { likes: number; comments: number; votes: number }> = {};
  const add = (arr: { createdAt: Date }[], key: 'likes' | 'comments' | 'votes') => {
    for (const item of arr) {
      const day = item.createdAt.toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { likes: 0, comments: 0, votes: 0 };
      dayMap[day][key]++;
    }
  };
  add(likes, 'likes');
  add(comments, 'comments');
  add(votes, 'votes');

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d, total: d.likes + d.comments + d.votes }));
  return { timeline, totals: { likes: likes.length, comments: comments.length, votes: votes.length } };
});


// GET /api/events/:eventId/photos/top-commented — Top20 photos by comment count
statsRoute(router, 'top-commented', 'Top commented', async (eventId) => {
  const grouped = await prisma.photoComment.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, deletedAt: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    commentCount: g._count.id,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/purge-stats — Deleted + purge-scheduled photo stats
statsRoute(router, 'purge-stats', 'Purge stats', async (eventId) => {
  const now = new Date();
  const [total, deleted, purgeScheduled, overdue] = await Promise.all([
    prisma.photo.count({ where: { eventId } }),
    prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
    prisma.photo.count({ where: { eventId, purgeAfter: { not: null } } }),
    prisma.photo.count({ where: { eventId, purgeAfter: { lte: now } } }),
  ]);
  return { total, deleted, purgeScheduled, overdue, activePhotos: total - deleted };
});


// GET /api/events/:eventId/photos/first-upload — First and last upload timestamps
statsRoute(router, 'first-upload', 'First upload', async (eventId) => {
  const [first, last, total] = await Promise.all([
    prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, url: true, createdAt: true, uploadedBy: true } }),
    prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, url: true, createdAt: true, uploadedBy: true } }),
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
  ]);

  const spanMs = first && last ? last.createdAt.getTime() - first.createdAt.getTime() : null;
  const spanHours = spanMs !== null ? Math.round(spanMs / 3_600_000 * 10) / 10 : null;
  return { total, first, last, spanHours };
});


// GET /api/events/:eventId/photos/upload-weekday-distribution — Upload count per weekday (0=Sun..6=Sat)
statsRoute(router, 'upload-weekday-distribution', 'Upload weekday distribution', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = Array.from({ length: 7 }, (_, i) => ({ weekday: i, label: labels[i], count: 0 }));
  for (const p of photos) {
    days[p.createdAt.getUTCDay()].count++;
  }

  const peakDay = days.reduce((max, d) => d.count > max.count ? d : max, days[0]);
  return { total: photos.length, days, peakDay: peakDay.weekday, peakDayLabel: peakDay.label };
});


// GET /api/events/:eventId/photos/size-timeline — Total storage bytes per day
statsRoute(router, 'size-timeline', 'Size timeline', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, sizeBytes: { not: null } },
    select: { createdAt: true, sizeBytes: true },
    orderBy: { createdAt: 'asc' },
  });

  const dayMap: Record<string, { count: number; bytes: bigint }> = {};
  for (const p of photos) {
    const day = p.createdAt.toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { count: 0, bytes: BigInt(0) };
    dayMap[day].count++;
    dayMap[day].bytes += BigInt(p.sizeBytes as bigint);
  }

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, count: d.count, bytes: Number(d.bytes) }));

  const totalBytes = timeline.reduce((s, t) => s + t.bytes, 0);
  return { totalBytes, timeline };
});


// GET /api/events/:eventId/photos/top-liked-pending — Top20 PENDING photos by like count
statsRoute(router, 'top-liked-pending', 'Top liked pending', async (eventId) => {
  const grouped = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId, status: 'PENDING', deletedAt: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const ids = (grouped as any[]).map((g) => g.photoId);
  const photos = ids.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, title: true, views: true, qualityScore: true, uploadedBy: true },
  }) : [];

  const result = (grouped as any[]).map((g) => ({
    ...(photos.find((p) => p.id === g.photoId) || {}),
    likeCount: g._count.id,
  }));
  return { photos: result };
});


// GET /api/events/:eventId/photos/vote-timeline — Votes per day timeline
statsRoute(router, 'vote-timeline', 'Vote timeline', async (eventId) => {
  const votes = await prisma.photoVote.findMany({
    where: { photo: { eventId } },
    select: { createdAt: true, rating: true },
  });

  const dayMap: Record<string, { count: number; ratingSum: number }> = {};
  for (const v of votes) {
    const day = v.createdAt.toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { count: 0, ratingSum: 0 };
    dayMap[day].count++;
    dayMap[day].ratingSum += v.rating;
  }

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, count: d.count, avgRating: Math.round((d.ratingSum / d.count) * 10) / 10 }));
  return { totalVotes: votes.length, timeline };
});


// GET /api/events/:eventId/photos/upload-hour-distribution — Upload count per hour-of-day (0-23)
statsRoute(router, 'upload-hour-distribution', 'Upload hour distribution', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  for (const p of photos) {
    hours[p.createdAt.getUTCHours()].count++;
  }

  const peakHour = hours.reduce((max, h) => h.count > max.count ? h : max, hours[0]);
  return { total: photos.length, hours, peakHour: peakHour.hour };
});


// GET /api/events/:eventId/photos/quality-distribution — qualityScore histogram (0-100 in 10-point buckets)
statsRoute(router, 'quality-distribution', 'Quality distribution', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, qualityScore: { not: null } },
    select: { qualityScore: true },
  });

  const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${(i + 1) * 10}`, min: i * 10, max: (i + 1) * 10, count: 0 }));
  for (const p of photos) {
    const idx = Math.min(Math.floor((p.qualityScore as number) / 10), 9);
    buckets[idx].count++;
  }

  const total = photos.length;
  const withScore = buckets.map((b) => ({ ...b, pct: total > 0 ? Math.round((b.count / total) * 100) : 0 }));
  return { total, buckets: withScore };
});


// GET /api/events/:eventId/photos/comment-timeline — Comments per day timeline
statsRoute(router, 'comment-timeline', 'Comment timeline', async (eventId) => {
  const comments = await prisma.photoComment.findMany({
    where: { photo: { eventId } },
    select: { createdAt: true, status: true },
  });

  const dayMap: Record<string, { total: number; approved: number; pending: number }> = {};
  for (const c of comments) {
    const day = c.createdAt.toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { total: 0, approved: 0, pending: 0 };
    dayMap[day].total++;
    if (c.status === 'APPROVED') dayMap[day].approved++;
    else if (c.status === 'PENDING') dayMap[day].pending++;
  }

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
  return { total: comments.length, timeline };
});


// GET /api/events/:eventId/photos/quality-top-approved — Top20 approved photos by quality
statsRoute(router, 'quality-top-approved', 'Quality top approved', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, status: 'APPROVED', qualityScore: { not: null } },
    select: { id: true, url: true, title: true, qualityScore: true, views: true, uploadedBy: true },
    orderBy: { qualityScore: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/hash-collision — Photos sharing perceptualHash (near-dupes)
statsRoute(router, 'hash-collision', 'Hash collision', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['perceptualHash'],
    where: { eventId, deletedAt: null, perceptualHash: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const collisions = await Promise.all((grouped as any[]).map(async (g) => {
    const members = await prisma.photo.findMany({
      where: { eventId, perceptualHash: g.perceptualHash, deletedAt: null },
      select: { id: true, url: true, qualityScore: true, isBestInGroup: true },
    });
    return { hash: g.perceptualHash, count: g._count.id, members };
  }));
  return { collisions, totalCollisionGroups: collisions.length };
});


// GET /api/events/:eventId/photos/tag-stats — Top50 tags by photo count
statsRoute(router, 'tag-stats', 'Tag stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, tags: { isEmpty: false } },
    select: { tags: true },
  });

  const tagMap: Record<string, number> = {};
  for (const p of photos) {
    for (const tag of p.tags) {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }
  }

  const tags = Object.entries(tagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([tag, count]) => ({ tag, count }));
  return { total: tags.length, uniqueTags: Object.keys(tagMap).length, tags };
});


// GET /api/events/:eventId/photos/uploader-stats — Top20 uploaders by photo count
statsRoute(router, 'uploader-stats', 'Uploader stats', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['uploadedBy'],
    where: { eventId, deletedAt: null, uploadedBy: { not: null } },
    _count: { id: true },
    _avg: { qualityScore: true, views: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const stats = (grouped as any[]).map((g) => ({
    uploadedBy: g.uploadedBy,
    photoCount: g._count.id,
    avgQuality: g._avg.qualityScore ? Math.round(g._avg.qualityScore * 10) / 10 : null,
    avgViews: Math.round((g._avg.views || 0) * 10) / 10,
  }));
  return { stats };
});


// GET /api/events/:eventId/photos/like-timeline — Likes per day
statsRoute(router, 'like-timeline', 'Like timeline', async (eventId) => {
  const likes = await prisma.photoLike.findMany({
    where: { photo: { eventId } },
    select: { createdAt: true },
  });

  const dayMap: Record<string, number> = {};
  for (const l of likes) {
    const day = l.createdAt.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  }

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
  return { totalLikes: likes.length, timeline };
});


// GET /api/events/:eventId/photos/category-stats — Photo count + avg quality per category
statsRoute(router, 'category-stats', 'Category stats', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['categoryId'],
    where: { eventId, deletedAt: null },
    _count: { id: true },
    _avg: { qualityScore: true, views: true },
  });

  const catIds = grouped.map((g: any) => g.categoryId).filter(Boolean) as string[];
  const categories = catIds.length > 0 ? await prisma.category.findMany({
    where: { id: { in: catIds } },
    select: { id: true, name: true },
  }) : [];

  const stats = grouped.map((g: any) => ({
    categoryId: g.categoryId,
    categoryName: categories.find((c) => c.id === g.categoryId)?.name || null,
    photoCount: g._count.id,
    avgQuality: g._avg.qualityScore ? Math.round(g._avg.qualityScore * 10) / 10 : null,
    avgViews: g._avg.views ? Math.round(g._avg.views * 10) / 10 : 0,
  })).sort((a, b) => b.photoCount - a.photoCount);
  return { stats };
});


// GET /api/events/:eventId/photos/quality-percentile — Quality score percentiles P25/P50/P75/P90
router.get('/:eventId/photos/quality-percentile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const scores = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      select: { qualityScore: true },
      orderBy: { qualityScore: 'asc' },
    });

    if (scores.length === 0) return res.json({ total: 0, percentiles: null });

    const vals = scores.map((s) => s.qualityScore as number);
    const pct = (p: number) => {
      const idx = Math.ceil((p / 100) * vals.length) - 1;
      return Math.round(vals[Math.max(0, idx)] * 10) / 10;
    };

    res.json({
      total: vals.length,
      percentiles: { p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90), p99: pct(99) },
      avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
    });
  } catch (error: any) {
    logger.error('Quality percentile error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/dupe-chain — Duplicate groups with member photo IDs
statsRoute(router, 'dupe-chain', 'Dupe chain', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['duplicateGroupId'],
    where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 30,
  });

  const chains = await Promise.all((grouped as any[]).map(async (g) => {
    const members = await prisma.photo.findMany({
      where: { eventId, duplicateGroupId: g.duplicateGroupId, deletedAt: null },
      select: { id: true, url: true, qualityScore: true, isBestInGroup: true },
    });
    return { groupId: g.duplicateGroupId, size: g._count.id, members };
  }));
  return { chains };
});


// GET /api/events/:eventId/photos/thumbnail-coverage — Thumbnail/WebP coverage rates
router.get('/:eventId/photos/thumbnail-coverage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withThumb, withWebp, withOriginal] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, storagePathThumb: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, storagePathWebp: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, storagePathOriginal: { not: null } } }),
    ]);

    res.json({
      total,
      withThumb, thumbRate: total > 0 ? Math.round((withThumb / total) * 100) : 0,
      withWebp, webpRate: total > 0 ? Math.round((withWebp / total) * 100) : 0,
      withOriginal, originalRate: total > 0 ? Math.round((withOriginal / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Thumbnail coverage error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/view-stats — View count aggregate statistics
router.get('/:eventId/photos/view-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withViews, agg] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, views: { gt: 0 } } }),
      prisma.photo.aggregate({
        where: { eventId, deletedAt: null },
        _avg: { views: true },
        _max: { views: true },
        _sum: { views: true },
      }),
    ]);

    const top10 = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, views: { gt: 0 } },
      select: { id: true, url: true, title: true, views: true },
      orderBy: { views: 'desc' },
      take: 10,
    });

    res.json({
      total, withViews,
      viewRate: total > 0 ? Math.round((withViews / total) * 100) : 0,
      avgViews: Math.round((agg._avg.views || 0) * 10) / 10,
      maxViews: agg._max.views || 0,
      totalViews: agg._sum.views || 0,
      top10,
    });
  } catch (error: any) {
    logger.error('View stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/story-stats — Story/favorite/bestInGroup flag statistics
router.get('/:eventId/photos/story-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, storyOnly, favorite, bestInGroup] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isBestInGroup: true } }),
    ]);

    res.json({
      total, storyOnly, favorite, bestInGroup,
      storyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0,
      favoriteRate: total > 0 ? Math.round((favorite / total) * 100) : 0,
      bestInGroupRate: total > 0 ? Math.round((bestInGroup / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Story stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/exif-stats — EXIF data availability statistics
router.get('/:eventId/photos/exif-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withExif, withGps, withFaceData] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, exifData: { not: Prisma.JsonNull } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { not: null } } }),
    ]);

    res.json({
      total,
      withExif, exifRate: total > 0 ? Math.round((withExif / total) * 100) : 0,
      withGps, gpsRate: total > 0 ? Math.round((withGps / total) * 100) : 0,
      withFaceData, faceDataRate: total > 0 ? Math.round((withFaceData / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('EXIF stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/geo-coverage — Bounding box of all GPS photos
router.get('/:eventId/photos/geo-coverage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      _min: { latitude: true, longitude: true },
      _max: { latitude: true, longitude: true },
      _count: { id: true },
    });

    if (result._count.id === 0) return res.json({ hasGps: false, total: 0 });

    const centerLat = ((result._min.latitude || 0) + (result._max.latitude || 0)) / 2;
    const centerLng = ((result._min.longitude || 0) + (result._max.longitude || 0)) / 2;

    res.json({
      hasGps: true,
      total: result._count.id,
      bounds: {
        minLat: result._min.latitude, maxLat: result._max.latitude,
        minLng: result._min.longitude, maxLng: result._max.longitude,
      },
      center: { lat: Math.round(centerLat * 10000) / 10000, lng: Math.round(centerLng * 10000) / 10000 },
    });
  } catch (error: any) {
    logger.error('Geo coverage error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/caption-leader — Top20 titled photos by views
statsRoute(router, 'caption-leader', 'Caption leader', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, title: { not: null } },
    select: { id: true, url: true, title: true, description: true, views: true, uploadedBy: true },
    orderBy: { views: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/face-stats — Face detection statistics
router.get('/:eventId/photos/face-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withFaces, noFaces] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { gt: 0 } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: 0 } }),
    ]);

    const faceResult = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, faceCount: { not: null } },
      _avg: { faceCount: true },
      _max: { faceCount: true },
      _sum: { faceCount: true },
    });

    const faceCountGroups = await prisma.photo.groupBy({
      by: ['faceCount'],
      where: { eventId, deletedAt: null, faceCount: { not: null } },
      _count: { id: true },
      orderBy: { faceCount: 'asc' },
    });

    res.json({
      total, withFaces,
      faceRate: total > 0 ? Math.round((withFaces / total) * 100) : 0,
      avgFaces: faceResult._avg.faceCount ? Math.round(faceResult._avg.faceCount * 10) / 10 : 0,
      maxFaces: faceResult._max.faceCount || 0,
      totalFaces: faceResult._sum.faceCount || 0,
      distribution: (faceCountGroups as any[]).map((g) => ({ faceCount: g.faceCount, count: g._count.id })),
    });
  } catch (error: any) {
    logger.error('Face stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/category-leader — Top photo per category by quality
statsRoute(router, 'category-leader', 'Category leader', async (eventId) => {
  const categories = await prisma.category.findMany({
    where: { eventId },
    select: { id: true, name: true },
  });

  const leaders = await Promise.all(categories.map(async (cat) => {
    const best = await prisma.photo.findFirst({
      where: { eventId, categoryId: cat.id, deletedAt: null },
      select: { id: true, url: true, title: true, qualityScore: true, views: true },
      orderBy: [{ qualityScore: 'desc' }, { views: 'desc' }],
    });
    const count = await prisma.photo.count({ where: { eventId, categoryId: cat.id, deletedAt: null } });
    return { categoryId: cat.id, categoryName: cat.name, count, leader: best };
  }));
  return { categories: leaders.filter((c) => c.count > 0) };
});


// GET /api/events/:eventId/photos/guest-leaderboard — Top20 guests by total engagement
statsRoute(router, 'guest-leaderboard', 'Guest leaderboard', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['guestId'],
    where: { eventId, deletedAt: null, guestId: { not: null } },
    _count: { id: true },
    _sum: { views: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const guestIds = (grouped as any[]).map((g) => g.guestId!).filter(Boolean);
  const guests = guestIds.length > 0 ? await prisma.guest.findMany({
    where: { id: { in: guestIds } },
    select: { id: true, firstName: true, lastName: true },
  }) : [];

  const leaderboard = (grouped as any[]).map((g) => {
    const guest = guests.find((gu) => gu.id === g.guestId);
    return {
      guestId: g.guestId,
      firstName: guest?.firstName || null,
      lastName: guest?.lastName || null,
      photoCount: g._count.id,
      totalViews: g._sum.views || 0,
    };
  });
  return { leaderboard };
});


// GET /api/events/:eventId/photos/purge-upcoming — Photos scheduled for purge in next 7 days
statsRouteWithReq(router, 'purge-upcoming', 'Purge upcoming', async (eventId, req) => {
  const days = parseInt((req.query.days as string) || '7', 10);
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const [upcoming, overdue] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId, deletedAt: null, purgeAfter: { lte: cutoff, gt: new Date() } },
      select: { id: true, url: true, title: true, purgeAfter: true },
      orderBy: { purgeAfter: 'asc' },
      take: 50,
    }),
    prisma.photo.count({ where: { eventId, deletedAt: null, purgeAfter: { lte: new Date() } } }),
  ]);
  return { upcoming, overdue, daysWindow: days };
});


// GET /api/events/:eventId/photos/trending — Most active photos last 24h (views+likes)
statsRoute(router, 'trending', 'Trending', async (eventId) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentLikes = await prisma.photoLike.groupBy({
    by: ['photoId'],
    where: { photo: { eventId }, createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const photoIds = (recentLikes as any[]).map((l) => l.photoId);
  const photos = photoIds.length > 0 ? await prisma.photo.findMany({
    where: { id: { in: photoIds }, deletedAt: null },
    select: { id: true, url: true, title: true, views: true },
  }) : [];

  const result = (recentLikes as any[]).map((l) => ({
    ...photos.find((p) => p.id === l.photoId),
    recentLikes: l._count.id,
  }));
  return { trending: result, since };
});


// GET /api/events/:eventId/photos/quality-grade-board — Top photo per quality grade A-F
statsRoute(router, 'quality-grade-board', 'Quality grade board', async (eventId) => {
  const grades = [
    { grade: 'A', min: 80, max: 100 },
    { grade: 'B', min: 60, max: 80 },
    { grade: 'C', min: 40, max: 60 },
    { grade: 'D', min: 20, max: 40 },
    { grade: 'F', min: 0, max: 20 },
  ];

  const board = await Promise.all(grades.map(async ({ grade, min, max }) => {
    const best = await prisma.photo.findFirst({
      where: { eventId, deletedAt: null, qualityScore: { gte: min, lt: max } },
      select: { id: true, url: true, title: true, qualityScore: true },
      orderBy: { qualityScore: 'desc' },
    });
    const count = await prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { gte: min, lt: max } } });
    return { grade, min, max, count, best };
  }));
  return { board };
});


// GET /api/events/:eventId/photos/size-bucket — Photos grouped by file size buckets
statsRoute(router, 'size-bucket', 'Size bucket', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, sizeBytes: { not: null } },
    select: { sizeBytes: true },
  });

  const buckets = { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 };
  for (const p of photos) {
    const mb = Number(p.sizeBytes!) / 1024 / 1024;
    if (mb < 0.5) buckets.tiny++;
    else if (mb < 2) buckets.small++;
    else if (mb < 5) buckets.medium++;
    else if (mb < 10) buckets.large++;
    else buckets.huge++;
  }
  return { total: photos.length, buckets };
});


// GET /api/events/:eventId/photos/view-leader — Top20 photos by view count
statsRoute(router, 'view-leader', 'View leader', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, views: { gt: 0 } },
    select: { id: true, url: true, title: true, views: true, uploadedBy: true },
    orderBy: { views: 'desc' },
    take: 20,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/recent-deleted — Recently soft-deleted photos (last 50)
statsRouteWithReq(router, 'recent-deleted', 'Recent deleted', async (eventId, req) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: { not: null } },
    select: { id: true, url: true, title: true, deletedAt: true, uploadedBy: true, createdAt: true },
    orderBy: { deletedAt: 'desc' },
    take: limit,
  });
  return { photos, total: photos.length };
});


// GET /api/events/:eventId/photos/geo-cluster — GPS photos grouped by rough lat/lng grid
statsRouteWithReq(router, 'geo-cluster', 'Geo cluster', async (eventId, req) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, latitude: true, longitude: true },
  });

  const precision = parseFloat((req.query.precision as string) || '2');
  const factor = Math.pow(10, precision);

  const clusterMap: Record<string, { lat: number; lng: number; count: number; ids: string[] }> = {};
  for (const p of photos) {
    const lat = Math.round(p.latitude! * factor) / factor;
    const lng = Math.round(p.longitude! * factor) / factor;
    const key = `${lat},${lng}`;
    if (!clusterMap[key]) clusterMap[key] = { lat, lng, count: 0, ids: [] };
    clusterMap[key].count++;
    if (clusterMap[key].ids.length < 5) clusterMap[key].ids.push(p.id);
  }

  const clusters = Object.values(clusterMap).sort((a, b) => b.count - a.count);
  return { total: photos.length, clusters: clusters.slice(0, 50) };
});


// GET /api/events/:eventId/photos/like-leader — Top20 photos by like count
statsRoute(router, 'like-leader', 'Like leader', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { id: true, url: true, title: true, uploadedBy: true, _count: { select: { likes: true } } },
    orderBy: { likes: { _count: 'desc' } },
    take: 20,
  });
  return { photos: photos.map((p: any) => ({ ...p, likeCount: p._count.likes, _count: undefined })) };
});


// GET /api/events/:eventId/photos/status-timeline — Status changes per day (createdAt)
statsRoute(router, 'status-timeline', 'Status timeline', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId },
    select: { createdAt: true, status: true },
  });

  const dayMap: Record<string, Record<string, number>> = {};
  for (const p of photos) {
    const day = p.createdAt.toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = {};
    dayMap[day][p.status] = (dayMap[day][p.status] || 0) + 1;
  }

  const timeline = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
  return { timeline };
});


// GET /api/events/:eventId/photos/comment-stats — Comment statistics
router.get('/:eventId/photos/comment-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, totalComments, approvedComments, pendingComments] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photoComment.count({ where: { photo: { eventId } } }),
      prisma.photoComment.count({ where: { photo: { eventId }, status: 'APPROVED' as any } }),
      prisma.photoComment.count({ where: { photo: { eventId }, status: 'PENDING' as any } }),
    ]);

    const photosWithComments = await prisma.photoComment.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _count: { id: true },
    });

    const topCommented = photosWithComments.sort((a: any, b: any) => b._count.id - a._count.id)[0];

    res.json({
      total,
      totalComments, approvedComments, pendingComments,
      photosWithComments: photosWithComments.length,
      commentRate: total > 0 ? Math.round((photosWithComments.length / total) * 100) : 0,
      avgCommentsPerPhoto: photosWithComments.length > 0 ? Math.round((totalComments / photosWithComments.length) * 10) / 10 : 0,
      topCommentedPhotoId: topCommented?.photoId || null,
      topCommentedCount: (topCommented as any)?._count?.id || 0,
    });
  } catch (error: any) {
    logger.error('Comment stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/vote-distribution — Vote rating distribution 1-5
router.get('/:eventId/photos/vote-distribution', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const votes = await prisma.photoVote.findMany({
      where: { photo: { eventId } },
      select: { rating: true },
    });

    const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const v of votes) ratingMap[v.rating] = (ratingMap[v.rating] || 0) + 1;

    const total = votes.length;
    const avg = total > 0 ? Math.round(votes.reduce((s, v) => s + v.rating, 0) / total * 10) / 10 : null;

    res.json({
      total,
      avg,
      distribution: Object.entries(ratingMap).map(([r, count]) => ({
        rating: parseInt(r),
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      })),
    });
  } catch (error: any) {
    logger.error('Vote distribution error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/engagement-score — Per-photo engagement score top20
statsRoute(router, 'engagement-score', 'Engagement score', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { id: true, url: true, title: true, views: true, _count: { select: { likes: true, comments: true } } },
    take: 200,
  });

  const scored = photos.map((p: any) => ({
    id: p.id, url: p.url, title: p.title,
    views: p.views, likes: p._count.likes, comments: p._count.comments,
    engagementScore: Math.round((p.views * 0.1 + p._count.likes * 2 + p._count.comments * 3) * 10) / 10,
  })).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20);
  return { photos: scored };
});


// GET /api/events/:eventId/photos/month-stats — Upload distribution by month (1-12)
statsRoute(router, 'month-stats', 'Month stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthMap: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) monthMap[m] = 0;
  for (const p of photos) monthMap[p.createdAt.getMonth() + 1]++;

  const months = Object.entries(monthMap).map(([m, count]) => ({ month: parseInt(m), name: monthNames[parseInt(m) - 1], count }));
  const peakMonth = months.reduce((a, b) => b.count > a.count ? b : a, months[0]);
  return { months, peakMonth: peakMonth.month, peakMonthName: peakMonth.name, peakMonthCount: peakMonth.count };
});


// GET /api/events/:eventId/photos/hash-stats — Perceptual hash / MD5 deduplication stats
router.get('/:eventId/photos/hash-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withMd5, withPerceptual, uniqueMd5, uniquePerceptual] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, md5Hash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, perceptualHash: { not: null } } }),
      prisma.photo.groupBy({ by: ['md5Hash'], where: { eventId, deletedAt: null, md5Hash: { not: null } }, _count: { id: true } }),
      prisma.photo.groupBy({ by: ['perceptualHash'], where: { eventId, deletedAt: null, perceptualHash: { not: null } }, _count: { id: true } }),
    ]);

    const uniqueMd5Count = (uniqueMd5 as any[]).length;
    const uniquePerceptualCount = (uniquePerceptual as any[]).length;

    res.json({
      total,
      withMd5Hash: withMd5, uniqueMd5Hashes: uniqueMd5Count,
      md5DupeRate: withMd5 > uniqueMd5Count ? Math.round(((withMd5 - uniqueMd5Count) / withMd5) * 100) : 0,
      withPerceptualHash: withPerceptual, uniquePerceptualHashes: uniquePerceptualCount,
      perceptualDupeRate: withPerceptual > uniquePerceptualCount ? Math.round(((withPerceptual - uniquePerceptualCount) / withPerceptual) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Hash stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/favorite-stats — Favorite/story-only photos
router.get('/:eventId/photos/favorite-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, favorites, storyOnly, bestInGroup] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isBestInGroup: true } }),
    ]);

    res.json({
      total, favorites, storyOnly, bestInGroup,
      favoriteRate: total > 0 ? Math.round((favorites / total) * 100) : 0,
      storyOnlyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Favorite stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/duplicate-group-stats — Duplicate group statistics
router.get('/:eventId/photos/duplicate-group-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, inGroup, uniqueGroups] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
      prisma.photo.groupBy({
        by: ['duplicateGroupId'],
        where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
        _count: { id: true },
      }),
    ]);

    const groupSizes = uniqueGroups as any[];
    const avgGroupSize = groupSizes.length > 0 ? Math.round((inGroup / groupSizes.length) * 10) / 10 : 0;

    res.json({
      total, inDuplicateGroup: inGroup,
      duplicateGroupCount: groupSizes.length,
      dupeRate: total > 0 ? Math.round((inGroup / total) * 100) : 0,
      avgGroupSize,
    });
  } catch (error: any) {
    logger.error('Duplicate group stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/blur-stats — Blur detection statistics
router.get('/:eventId/photos/blur-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withQuality, lowQuality, midQuality, highQuality] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { lt: 30 } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { gte: 30, lt: 70 } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { gte: 70 } } }),
    ]);

    const qResult = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
    });

    res.json({
      total, withQualityScore: withQuality,
      lowQuality, midQuality, highQuality,
      lowQualityRate: total > 0 ? Math.round((lowQuality / total) * 100) : 0,
      avgQualityScore: qResult._avg.qualityScore ? Math.round(qResult._avg.qualityScore * 10) / 10 : null,
    });
  } catch (error: any) {
    logger.error('Blur stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/ai-stats — AI analysis statistics (captions/labels)
router.get('/:eventId/photos/ai-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withTitle, withDescription, withTags, withFaceData] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, title: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, description: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, tags: { isEmpty: false } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { gt: 0 } } }),
    ]);

    res.json({
      total,
      withTitle, titleRate: total > 0 ? Math.round((withTitle / total) * 100) : 0,
      withDescription, descriptionRate: total > 0 ? Math.round((withDescription / total) * 100) : 0,
      withTags, tagsRate: total > 0 ? Math.round((withTags / total) * 100) : 0,
      withFaces: withFaceData, faceRate: total > 0 ? Math.round((withFaceData / total) * 100) : 0,
      enrichedTotal: await prisma.photo.count({ where: { eventId, deletedAt: null, OR: [{ title: { not: null } }, { description: { not: null } }, { faceCount: { gt: 0 } }] } }),
    });
  } catch (error: any) {
    logger.error('AI stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/tag-stats — Top tags by frequency
statsRoute(router, 'tag-stats', 'Tag stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { tags: true },
  });

  const tagMap: Record<string, number> = {};
  for (const p of photos) {
    for (const tag of p.tags) {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }
  }

  const tags = Object.entries(tagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([tag, count]) => ({ tag, count }));
  return { tags, uniqueTags: Object.keys(tagMap).length, totalTagUsages: Object.values(tagMap).reduce((a, b) => a + b, 0) };
});


// GET /api/events/:eventId/photos/uploader-stats — Photos by uploader name/ID top20
router.get('/:eventId/photos/uploader-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    res.json({
      uploaders: grouped.map((g: any) => ({ uploadedBy: g.uploadedBy || 'anonymous', count: g._count.id })),
    });
  } catch (error: any) {
    logger.error('Uploader stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/activity-feed — Recent uploads/likes/comments (last 50)
statsRouteWithReq(router, 'activity-feed', 'Activity feed', async (eventId, req) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

  const [recentUploads, recentLikes, recentComments] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, title: true, uploadedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.photoLike.findMany({
      where: { photo: { eventId } },
      select: { id: true, photoId: true, guestId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.photoComment.findMany({
      where: { photo: { eventId } },
      select: { id: true, photoId: true, authorName: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);
  return { recentUploads, recentLikes, recentComments };
});


// GET /api/events/:eventId/photos/overview — Master summary of all photo statistics
router.get('/:eventId/photos/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, approved, pending, rejected, deleted, withGps, withQuality, totalViews, totalLikes, totalComments] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' as any } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' as any } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' as any } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { not: null } } }),
      prisma.photo.aggregate({ where: { eventId, deletedAt: null }, _sum: { views: true } }),
      prisma.photoLike.count({ where: { photo: { eventId } } }),
      prisma.photoComment.count({ where: { photo: { eventId } } }),
    ]);

    const sizeResult = await prisma.photo.aggregate({ where: { eventId, deletedAt: null, sizeBytes: { not: null } }, _sum: { sizeBytes: true } });
    const qualityResult = await prisma.photo.aggregate({ where: { eventId, deletedAt: null, qualityScore: { not: null } }, _avg: { qualityScore: true } });
    const newestPhoto = await prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    const firstPhoto = await prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });

    res.json({
      total, approved, pending, rejected, deleted,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      withGps, gpsRate: total > 0 ? Math.round((withGps / total) * 100) : 0,
      withQuality, avgQuality: qualityResult._avg.qualityScore ? Math.round(qualityResult._avg.qualityScore * 10) / 10 : null,
      totalViews: totalViews._sum.views || 0,
      totalLikes, totalComments,
      totalSizeMB: sizeResult._sum.sizeBytes ? Math.round(Number(sizeResult._sum.sizeBytes) / 1024 / 1024 * 100) / 100 : null,
      firstPhotoAt: firstPhoto?.createdAt || null,
      newestPhotoAt: newestPhoto?.createdAt || null,
    });
  } catch (error: any) {
    logger.error('Overview error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/daily-stats — Upload distribution by weekday (0=Sun..6=Sat)
statsRoute(router, 'daily-stats', 'Daily stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const dayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const p of photos) dayMap[p.createdAt.getDay()]++;

  const days = Object.entries(dayMap).map(([d, count]) => ({ day: parseInt(d), name: dayNames[parseInt(d)], count }));
  const peakDay = days.reduce((a, b) => b.count > a.count ? b : a, days[0]);
  return { days, peakDay: peakDay.day, peakDayName: peakDay.name, peakDayCount: peakDay.count };
});


// GET /api/events/:eventId/photos/best-of — Best photo by views, likes, votes, quality
statsRoute(router, 'best-of', 'Best-of', async (eventId) => {
  const [mostViewed, mostLiked, bestQuality, newest] = await Promise.all([
    prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { views: 'desc' }, select: { id: true, url: true, title: true, views: true } }),
    prisma.photo.findFirst({
      where: { eventId, deletedAt: null },
      orderBy: { likes: { _count: 'desc' } },
      select: { id: true, url: true, title: true, _count: { select: { likes: true } } },
    }),
    prisma.photo.findFirst({ where: { eventId, deletedAt: null, qualityScore: { not: null } }, orderBy: { qualityScore: 'desc' }, select: { id: true, url: true, title: true, qualityScore: true } }),
    prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, url: true, title: true, createdAt: true } }),
  ]);
  return { mostViewed, mostLiked, bestQuality, newest };
});


// GET /api/events/:eventId/photos/hourly-stats — Upload distribution by hour (0-23)
statsRoute(router, 'hourly-stats', 'Hourly stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const hourMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;
  for (const p of photos) hourMap[p.createdAt.getHours()]++;

  const hours = Object.entries(hourMap).map(([h, count]) => ({ hour: parseInt(h), count }));
  const peakHour = hours.reduce((a, b) => b.count > a.count ? b : a, { hour: 0, count: 0 });
  const quietHour = hours.filter(h => h.count > 0).reduce((a, b) => b.count < a.count ? b : a, { hour: 0, count: Infinity });
  return { hours, peakHour: peakHour.hour, peakHourCount: peakHour.count, quietHour: quietHour.count === Infinity ? null : quietHour.hour };
});


// GET /api/events/:eventId/photos/storage-stats — Storage size breakdown
router.get('/:eventId/photos/storage-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      _sum: { sizeBytes: true },
      _avg: { sizeBytes: true },
      _max: { sizeBytes: true },
      _min: { sizeBytes: true },
      _count: { id: true },
    });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      select: { sizeBytes: true, storagePath: true },
    });

    const formatMap: Record<string, number> = {};
    for (const p of photos) {
      const ext = (p.storagePath.split('.').pop() || 'unknown').toLowerCase();
      formatMap[ext] = (formatMap[ext] || 0) + 1;
    }

    const toMB = (b: bigint | number | null) => b ? Math.round(Number(b) / 1024 / 1024 * 100) / 100 : null;

    res.json({
      withSize: result._count.id,
      totalMB: toMB(result._sum.sizeBytes),
      avgMB: toMB(result._avg.sizeBytes),
      maxMB: toMB(result._max.sizeBytes),
      minMB: toMB(result._min.sizeBytes),
      formats: Object.entries(formatMap).sort(([, a], [, b]) => b - a).map(([mime, count]) => ({ mime, count })),
    });
  } catch (error: any) {
    logger.error('Storage stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/top-rated — Combined quality+votes score top20
router.get('/:eventId/photos/top-rated', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, title: true, qualityScore: true, views: true, uploadedBy: true },
      orderBy: [{ qualityScore: 'desc' }, { views: 'desc' }],
      take: 20,
    });

    const voteTotals = await prisma.photoVote.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _avg: { rating: true },
      _count: { id: true },
    });
    const voteMap = Object.fromEntries(voteTotals.map((v: any) => [v.photoId, { avg: v._avg.rating || 0, count: v._count.id }]));

    res.json({
      photos: photos.map((p) => {
        const voteInfo = voteMap[p.id] || { avg: 0, count: 0 };
        const score = Math.round(((p.qualityScore || 0) * 0.6 + voteInfo.avg * 10 * 0.4) * 10) / 10;
        return { ...p, voteAvg: Math.round(voteInfo.avg * 10) / 10, voteCount: voteInfo.count, combinedScore: score };
      }).sort((a, b) => b.combinedScore - a.combinedScore),
    });
  } catch (error: any) {
    logger.error('Top rated error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/guest-stats — Photos per guest top20
router.get('/:eventId/photos/guest-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['guestId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const guestIds = grouped.map((g: any) => g.guestId).filter(Boolean);
    const guests = guestIds.length > 0
      ? await prisma.guest.findMany({ where: { id: { in: guestIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));

    res.json({
      guests: grouped.map((g: any) => {
        const guest = guestMap[g.guestId];
        return {
          guestId: g.guestId,
          name: guest ? `${guest.firstName} ${guest.lastName}`.trim() : null,
          photoCount: g._count.id,
        };
      }),
    });
  } catch (error: any) {
    logger.error('Guest stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/purge-stats — Deleted and purge-scheduled photos
router.get('/:eventId/photos/purge-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const now = new Date();
    const [total, deleted, withPurge, expiredPurge] = await Promise.all([
      prisma.photo.count({ where: { eventId } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photo.count({ where: { eventId, purgeAfter: { not: null } } }),
      prisma.photo.count({ where: { eventId, purgeAfter: { lte: now } } }),
    ]);

    const soonPurge = await prisma.photo.count({
      where: { eventId, purgeAfter: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
    });

    res.json({
      total, deleted, active: total - deleted,
      deleteRate: total > 0 ? Math.round((deleted / total) * 100) : 0,
      withPurgeSchedule: withPurge,
      expiredPurge, soonPurgeIn7Days: soonPurge,
    });
  } catch (error: any) {
    logger.error('Purge stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/quality-stats — Quality score distribution
router.get('/:eventId/photos/quality-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _min: { qualityScore: true },
      _max: { qualityScore: true },
      _count: { id: true },
    });

    const total = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      select: { qualityScore: true },
    });

    const qBuckets: Record<string, number> = { 'A (90-100)': 0, 'B (70-89)': 0, 'C (50-69)': 0, 'D (30-49)': 0, 'F (<30)': 0 };
    for (const p of photos) {
      const q = p.qualityScore || 0;
      if (q >= 90) qBuckets['A (90-100)']++;
      else if (q >= 70) qBuckets['B (70-89)']++;
      else if (q >= 50) qBuckets['C (50-69)']++;
      else if (q >= 30) qBuckets['D (30-49)']++;
      else qBuckets['F (<30)']++;
    }

    res.json({
      total, withQuality: result._count.id,
      qualityRate: total > 0 ? Math.round((result._count.id / total) * 100) : 0,
      avgQuality: result._avg.qualityScore ? Math.round(result._avg.qualityScore * 10) / 10 : null,
      minQuality: result._min.qualityScore, maxQuality: result._max.qualityScore,
      gradeBuckets: Object.entries(qBuckets).map(([label, count]) => ({ label, count })),
    });
  } catch (error: any) {
    logger.error('Quality stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/face-analysis — Face detection analysis
router.get('/:eventId/photos/face-analysis', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, faceCount: { not: null } },
      _avg: { faceCount: true },
      _max: { faceCount: true },
      _sum: { faceCount: true },
      _count: { id: true },
    });

    const total = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    const withFaces = await prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { gt: 0 } } });
    const topFacePhoto = await prisma.photo.findFirst({
      where: { eventId, deletedAt: null, faceCount: { gt: 0 } },
      select: { id: true, url: true, faceCount: true },
      orderBy: { faceCount: 'desc' },
    });

    res.json({
      total, withFaceData: result._count.id,
      withFaces, faceRate: total > 0 ? Math.round((withFaces / total) * 100) : 0,
      totalFaces: result._sum.faceCount || 0,
      avgFaces: result._avg.faceCount ? Math.round(result._avg.faceCount * 10) / 10 : 0,
      maxFaces: result._max.faceCount || 0,
      topFacePhoto,
    });
  } catch (error: any) {
    logger.error('Face analysis error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/download-stats — View/download statistics
router.get('/:eventId/photos/download-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
      _count: { id: true },
    });

    const topViewed = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, views: { gt: 0 } },
      select: { id: true, url: true, title: true, views: true },
      orderBy: { views: 'desc' },
      take: 10,
    });

    const zeroViews = await prisma.photo.count({ where: { eventId, deletedAt: null, views: 0 } });
    const total = result._count.id;

    res.json({
      totalViews: result._sum.views || 0,
      avgViews: result._avg.views ? Math.round(result._avg.views * 10) / 10 : 0,
      maxViews: result._max.views || 0,
      zeroViews,
      seenRate: total > 0 ? Math.round(((total - zeroViews) / total) * 100) : 0,
      topViewed,
    });
  } catch (error: any) {
    logger.error('Download stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/exif-stats — EXIF technical statistics (GPS/focal/ISO/shutter)
router.get('/:eventId/photos/exif-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    let withGps = 0, withFocal = 0, withIso = 0, withShutter = 0;
    const isoValues: number[] = [];
    const focalValues: number[] = [];

    for (const p of photos) {
      const exif = p.exifData as any;
      if (!exif || typeof exif !== 'object') continue;
      if (exif.latitude || exif.GPSLatitude) withGps++;
      if (exif.focalLength || exif.FocalLength) { withFocal++; const v = parseFloat(exif.focalLength || exif.FocalLength); if (!isNaN(v)) focalValues.push(v); }
      if (exif.iso || exif.ISO) { withIso++; const v = parseInt(exif.iso || exif.ISO, 10); if (!isNaN(v)) isoValues.push(v); }
      if (exif.shutterSpeed || exif.ExposureTime) withShutter++;
    }

    const total = photos.length;
    res.json({
      total,
      withGps, gpsRate: total > 0 ? Math.round((withGps / total) * 100) : 0,
      withFocal, focalRate: total > 0 ? Math.round((withFocal / total) * 100) : 0,
      withIso, isoRate: total > 0 ? Math.round((withIso / total) * 100) : 0,
      withShutter, shutterRate: total > 0 ? Math.round((withShutter / total) * 100) : 0,
      avgIso: isoValues.length > 0 ? Math.round(isoValues.reduce((a, b) => a + b, 0) / isoValues.length) : null,
      avgFocal: focalValues.length > 0 ? Math.round(focalValues.reduce((a, b) => a + b, 0) / focalValues.length * 10) / 10 : null,
    });
  } catch (error: any) {
    logger.error('EXIF stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/resolution-stats — Image dimension statistics (from exifData)
router.get('/:eventId/photos/resolution-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    const buckets: Record<string, number> = { '<1MP': 0, '1-4MP': 0, '4-12MP': 0, '12-25MP': 0, '>25MP': 0 };
    let withDimensions = 0;
    const widths: number[] = [], heights: number[] = [];

    for (const p of photos) {
      const exif = p.exifData as any;
      if (!exif || typeof exif !== 'object') continue;
      const w = exif.imageWidth || exif.ExifImageWidth || exif.PixelXDimension || exif.width;
      const h = exif.imageHeight || exif.ExifImageHeight || exif.PixelYDimension || exif.height;
      if (!w || !h) continue;
      withDimensions++;
      widths.push(Number(w)); heights.push(Number(h));
      const mp = (Number(w) * Number(h)) / 1e6;
      if (mp < 1) buckets['<1MP']++;
      else if (mp < 4) buckets['1-4MP']++;
      else if (mp < 12) buckets['4-12MP']++;
      else if (mp < 25) buckets['12-25MP']++;
      else buckets['>25MP']++;
    }

    const avgWidth = widths.length > 0 ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : null;
    const avgHeight = heights.length > 0 ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : null;

    res.json({
      withDimensions, avgWidth, avgHeight,
      maxWidth: widths.length > 0 ? Math.max(...widths) : null,
      maxHeight: heights.length > 0 ? Math.max(...heights) : null,
      megapixelBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
    });
  } catch (error: any) {
    logger.error('Resolution stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/camera-stats — EXIF camera make/model statistics
statsRoute(router, 'camera-stats', 'Camera stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { exifData: true },
  });

  const makeMap: Record<string, number> = {};
  const modelMap: Record<string, number> = {};
  let withExif = 0;

  for (const p of photos) {
    const exif = p.exifData as any;
    if (!exif || typeof exif !== 'object') continue;
    withExif++;
    const make = exif.make || exif.Make || null;
    const model = exif.model || exif.Model || null;
    if (make) makeMap[make] = (makeMap[make] || 0) + 1;
    if (model) modelMap[model] = (modelMap[model] || 0) + 1;
  }

  const makes = Object.entries(makeMap).sort(([, a], [, b]) => b - a).slice(0, 20).map(([make, count]) => ({ make, count }));
  const models = Object.entries(modelMap).sort(([, a], [, b]) => b - a).slice(0, 20).map(([model, count]) => ({ model, count }));
  return { makes, models, withExif, totalPhotos: photos.length };
});


// GET /api/events/:eventId/photos/duplicate-stats — Duplicate detection statistics
router.get('/:eventId/photos/duplicate-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withMd5, withPerceptual, inGroup] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, md5Hash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, perceptualHash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
    ]);

    const dupeGroups = await prisma.photo.groupBy({
      by: ['duplicateGroupId'],
      where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
    });

    res.json({
      total,
      withMd5, md5Rate: total > 0 ? Math.round((withMd5 / total) * 100) : 0,
      withPerceptual, perceptualRate: total > 0 ? Math.round((withPerceptual / total) * 100) : 0,
      inGroup, dupeGroupCount: dupeGroups.length,
      dupeRate: total > 0 ? Math.round((inGroup / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Duplicate stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/approval-stats — Moderation approval statistics
router.get('/:eventId/photos/approval-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const statuses = await prisma.photo.groupBy({
      by: ['status'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
    });

    const total = statuses.reduce((s: number, g: any) => s + g._count.id, 0);
    const statsMap = Object.fromEntries(statuses.map((s: any) => [s.status, s._count.id]));

    res.json({
      total,
      pending: statsMap['PENDING'] || 0,
      approved: statsMap['APPROVED'] || 0,
      rejected: statsMap['REJECTED'] || 0,
      approvalRate: total > 0 ? Math.round(((statsMap['APPROVED'] || 0) / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round(((statsMap['REJECTED'] || 0) / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Approval stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/weekly-stats — Photos grouped by ISO week (YYYY-Www)
statsRoute(router, 'weekly-stats', 'Weekly stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const weekMap: Record<string, number> = {};
  for (const p of photos) {
    const d = p.createdAt;
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    weekMap[key] = (weekMap[key] || 0) + 1;
  }

  const weeks = Object.entries(weekMap).map(([week, count]) => ({ week, count }));
  const peakWeek = weeks.reduce((a, b) => b.count > a.count ? b : a, { week: '', count: 0 });
  return { weeks, totalWeeks: weeks.length, peakWeek: peakWeek.week, peakWeekCount: peakWeek.count };
});


// GET /api/events/:eventId/photos/monthly-stats — Photos grouped by YYYY-MM
statsRoute(router, 'monthly-stats', 'Monthly stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const monthMap: Record<string, number> = {};
  for (const p of photos) {
    const key = p.createdAt.toISOString().slice(0, 7);
    monthMap[key] = (monthMap[key] || 0) + 1;
  }

  const months = Object.entries(monthMap).map(([month, count]) => ({ month, count }));
  const peakMonth = months.reduce((a, b) => b.count > a.count ? b : a, { month: '', count: 0 });
  return { months, totalMonths: months.length, peakMonth: peakMonth.month, peakMonthCount: peakMonth.count };
});


// GET /api/events/:eventId/photos/favorite-stats — Favorite photo statistics
router.get('/:eventId/photos/favorite-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, favorites] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
    ]);

    const topFavorites = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, isFavorite: true },
      select: { id: true, url: true, title: true, uploadedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      total,
      favorites,
      notFavorites: total - favorites,
      favoriteRate: total > 0 ? Math.round((favorites / total) * 100) : 0,
      recentFavorites: topFavorites,
    });
  } catch (error: any) {
    logger.error('Favorite stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/like-stats — Like statistics per event
router.get('/:eventId/photos/like-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const totalLikes = await prisma.photoLike.count({ where: { photo: { eventId } } });
    const topLiked = await prisma.photoLike.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const totalPhotos = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    res.json({
      totalLikes,
      avgLikesPerPhoto: totalPhotos > 0 ? Math.round((totalLikes / totalPhotos) * 100) / 100 : 0,
      topLiked: topLiked.map((l: any) => ({ photoId: l.photoId, likeCount: l._count.id })),
    });
  } catch (error: any) {
    logger.error('Like stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/tag-cloud — Top 100 tags sorted by frequency
statsRoute(router, 'tag-cloud', 'Tag cloud', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, tags: { isEmpty: false } },
    select: { tags: true },
  });

  const tagMap: Record<string, number> = {};
  for (const p of photos) {
    for (const tag of p.tags) {
      const t = tag.toLowerCase().trim();
      if (t) tagMap[t] = (tagMap[t] || 0) + 1;
    }
  }

  const tags = Object.entries(tagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 100)
    .map(([tag, count]) => ({ tag, count }));
  return { tags, totalUniqueTags: Object.keys(tagMap).length };
});


// GET /api/events/:eventId/photos/story-stats — Story-only photo statistics
router.get('/:eventId/photos/story-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, storyOnly] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
    ]);

    const storyUploaders = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null, isStoryOnly: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    res.json({
      total,
      storyOnly,
      notStoryOnly: total - storyOnly,
      storyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0,
      topStoryUploaders: storyUploaders.map((u: any) => ({ uploadedBy: u.uploadedBy || 'Anonymous', count: u._count.id })),
    });
  } catch (error: any) {
    logger.error('Story stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/comment-authors — Top commenters by comment count
statsRoute(router, 'comment-authors', 'Comment authors', async (eventId) => {
  const grouped = await prisma.photoComment.groupBy({
    by: ['authorName'],
    where: { photo: { eventId } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  });
  return { authors: grouped.map((g: any) => ({ authorName: g.authorName, count: g._count.id })), total: grouped.length };
});


// GET /api/events/:eventId/photos/vote-stats — Voting statistics
router.get('/:eventId/photos/vote-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photoVote.aggregate({
      where: { photo: { eventId } },
      _count: { id: true },
      _avg: { rating: true },
      _min: { rating: true },
      _max: { rating: true },
    });

    const topVoted = await prisma.photoVote.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _avg: { rating: true },
      _count: { id: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 1,
    });

    res.json({
      totalVotes: result._count.id,
      avgRating: Math.round(((result._avg.rating || 0) * 100)) / 100,
      minRating: result._min.rating || 0,
      maxRating: result._max.rating || 0,
      topPhotoId: topVoted[0]?.photoId || null,
      topPhotoAvgRating: topVoted[0] ? Math.round(((topVoted[0]._avg.rating || 0) * 100)) / 100 : 0,
    });
  } catch (error: any) {
    logger.error('Vote stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/size-distribution — sizeBytes buckets
router.get('/:eventId/photos/size-distribution', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      select: { sizeBytes: true },
    });

    const buckets = [
      { label: '<100KB', maxBytes: 100 * 1024, count: 0 },
      { label: '100-500KB', maxBytes: 500 * 1024, count: 0 },
      { label: '500KB-1MB', maxBytes: 1024 * 1024, count: 0 },
      { label: '1-3MB', maxBytes: 3 * 1024 * 1024, count: 0 },
      { label: '3-10MB', maxBytes: 10 * 1024 * 1024, count: 0 },
      { label: '>10MB', maxBytes: Infinity, count: 0 },
    ];

    for (const p of photos) {
      const bytes = Number(p.sizeBytes);
      const bucket = buckets.find(b => bytes < b.maxBytes) || buckets[buckets.length - 1];
      bucket.count++;
    }

    const agg = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      _avg: { sizeBytes: true },
      _sum: { sizeBytes: true },
      _max: { sizeBytes: true },
    });

    res.json({
      buckets: buckets.map(({ label, count }) => ({ label, count })),
      totalSizeMB: agg._sum.sizeBytes ? Math.round(Number(agg._sum.sizeBytes) / 1024 / 1024 * 100) / 100 : 0,
      avgSizeKB: agg._avg.sizeBytes ? Math.round(Number(agg._avg.sizeBytes) / 1024 * 10) / 10 : 0,
      maxSizeMB: agg._max.sizeBytes ? Math.round(Number(agg._max.sizeBytes) / 1024 / 1024 * 100) / 100 : 0,
    });
  } catch (error: any) {
    logger.error('Size distribution error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/geo-cluster — Geographic bounding box + center point
router.get('/:eventId/photos/geo-cluster', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      _min: { latitude: true, longitude: true },
      _max: { latitude: true, longitude: true },
      _avg: { latitude: true, longitude: true },
      _count: { id: true },
    });

    res.json({
      geoPhotos: result._count.id,
      bbox: { minLat: result._min.latitude, maxLat: result._max.latitude, minLng: result._min.longitude, maxLng: result._max.longitude },
      center: { lat: result._avg.latitude, lng: result._avg.longitude },
    });
  } catch (error: any) {
    logger.error('Geo cluster error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/uploader-stats — Top uploaders by photo count
router.get('/:eventId/photos/uploader-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    const total = grouped.reduce((s: number, g: any) => s + g._count.id, 0);
    res.json({
      uploaders: grouped.map((g: any) => ({
        uploadedBy: g.uploadedBy || 'Anonymous',
        count: g._count.id,
        rate: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
      })),
      totalUploaders: grouped.length,
    });
  } catch (error: any) {
    logger.error('Uploader stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/activity — Recent activity feed (uploads, likes, comments)
statsRouteWithReq(router, 'activity', 'Activity feed', async (eventId, req) => {
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);

  const [uploads, likes, comments] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, uploadedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.photoLike.findMany({
      where: { photo: { eventId } },
      select: { id: true, photoId: true, guestId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.photoComment.findMany({
      where: { photo: { eventId } },
      select: { id: true, photoId: true, authorName: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const feed = [
    ...uploads.map((u: any) => ({ type: 'upload', id: u.id, photoId: u.id, actor: u.uploadedBy, createdAt: u.createdAt })),
    ...likes.map((l: any) => ({ type: 'like', id: l.id, photoId: l.photoId, actor: l.guestId, createdAt: l.createdAt })),
    ...comments.map((c: any) => ({ type: 'comment', id: c.id, photoId: c.photoId, actor: c.authorName, content: c.comment, createdAt: c.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  return { feed, count: feed.length };
});


// GET /api/events/:eventId/photos/retention-stats — Photo age distribution buckets
statsRoute(router, 'retention-stats', 'Retention stats', async (eventId) => {
  const now = new Date();
  const buckets = [
    { label: '<1h', ms: 3600000 },
    { label: '1h-24h', ms: 86400000 },
    { label: '1-7d', ms: 7 * 86400000 },
    { label: '7-30d', ms: 30 * 86400000 },
    { label: '30-90d', ms: 90 * 86400000 },
    { label: '>90d', ms: Infinity },
  ];

  const counts = await Promise.all(
    buckets.map((b, i) => {
      const from = new Date(now.getTime() - b.ms);
      const to = i > 0 ? new Date(now.getTime() - (buckets[i - 1]?.ms ?? 0)) : now;
      if (i === 0) return prisma.photo.count({ where: { eventId, deletedAt: null, createdAt: { gte: from } } });
      if (b.ms === Infinity) return prisma.photo.count({ where: { eventId, deletedAt: null, createdAt: { lt: new Date(now.getTime() - buckets[i - 1].ms) } } });
      return prisma.photo.count({ where: { eventId, deletedAt: null, createdAt: { gte: from, lt: to } } });
    })
  );
  return { buckets: buckets.map((b, i) => ({ label: b.label, count: counts[i] })) };
});


// GET /api/events/:eventId/photos/category-progress — Photo counts per category with challenge completion
router.get('/:eventId/photos/category-progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const categories = await prisma.category.findMany({
      where: { eventId },
      select: { id: true, name: true, challengeEnabled: true, _count: { select: { photos: true } } },
      orderBy: { order: 'asc' },
    });

    const uncategorized = await prisma.photo.count({
      where: { eventId, deletedAt: null, categoryId: null },
    });

    res.json({
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        challengeEnabled: c.challengeEnabled,
        photoCount: c._count.photos,
      })),
      uncategorized,
      totalCategories: categories.length,
    });
  } catch (error: any) {
    logger.error('Category progress error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/best-in-group — Best photos per duplicate group
statsRoute(router, 'best-in-group', 'Best-in-group', async (eventId) => {
  const [totalGroups, bestPhotos, photosInGroups] = await Promise.all([
    prisma.photo.groupBy({
      by: ['duplicateGroupId'],
      where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
    }).then((g: any[]) => g.length),
    prisma.photo.count({ where: { eventId, deletedAt: null, isBestInGroup: true } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
  ]);
  return { totalGroups, bestPhotos, photosInGroups, avgGroupSize: totalGroups > 0 ? Math.round((photosInGroups / totalGroups) * 10) / 10 : 0 };
});


// GET /api/events/:eventId/photos/quality-histogram — Quality score distribution (0-10 buckets)
router.get('/:eventId/photos/quality-histogram', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      select: { qualityScore: true },
    });

    const buckets = Array.from({ length: 11 }, (_, i) => ({ bucket: i, label: `${i * 10}-${i * 10 + 9}%`, count: 0 }));
    for (const p of photos) {
      const score = p.qualityScore as number;
      const bucket = Math.min(10, Math.floor((score / 100) * 10));
      buckets[bucket].count++;
    }

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _min: { qualityScore: true },
      _max: { qualityScore: true },
    });

    res.json({
      buckets,
      avgQuality: Math.round(((result._avg.qualityScore || 0) * 100)) / 100,
      minQuality: result._min.qualityScore || 0,
      maxQuality: result._max.qualityScore || 0,
      analyzedPhotos: photos.length,
    });
  } catch (error: any) {
    logger.error('Quality histogram error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/face-stats — Face detection statistics
router.get('/:eventId/photos/face-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { faceCount: true },
      _avg: { faceCount: true },
      _max: { faceCount: true },
      _count: { id: true },
    });

    const withFaces = await prisma.photo.count({
      where: { eventId, deletedAt: null, faceCount: { gt: 0 } },
    });

    const total = result._count.id;
    res.json({
      totalFaces: result._sum.faceCount || 0,
      avgFaces: Math.round(((result._avg.faceCount || 0) * 100)) / 100,
      maxFaces: result._max.faceCount || 0,
      photosWithFaces: withFaces,
      photosWithoutFaces: total - withFaces,
      faceRate: total > 0 ? Math.round((withFaces / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Face stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/mime-stats — Photos grouped by MIME type from EXIF
statsRoute(router, 'mime-stats', 'MIME stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { storagePath: true },
  });

  const mimeMap: Record<string, number> = {};
  for (const p of photos) {
    const ext = p.storagePath.split('.').pop()?.toLowerCase() || 'unknown';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : ext === 'gif' ? 'image/gif'
      : ext === 'heic' || ext === 'heif' ? 'image/heic'
      : ext === 'avif' ? 'image/avif'
      : ext === 'tiff' || ext === 'tif' ? 'image/tiff'
      : `other/${ext}`;
    mimeMap[mime] = (mimeMap[mime] || 0) + 1;
  }

  const total = photos.length;
  const mimes = Object.entries(mimeMap)
    .sort(([, a], [, b]) => b - a)
    .map(([mime, count]) => ({ mime, count, rate: total > 0 ? Math.round((count / total) * 100) : 0 }));
  return { mimes, total, totalTypes: mimes.length };
});


// GET /api/events/:eventId/photos/by-orientation — Photos grouped by orientation (portrait/landscape/square)
router.get('/:eventId/photos/by-orientation', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    let portrait = 0, landscape = 0, square = 0, unknown = 0;
    for (const p of photos) {
      const exif = p.exifData as any;
      const orientation = exif?.Orientation ?? exif?.orientation;
      if (!orientation) { unknown++; continue; }
      const o = Number(orientation);
      if (o === 1 || o === 3) landscape++;
      else if (o === 6 || o === 8) portrait++;
      else if (o === 5 || o === 7) square++;
      else unknown++;
    }

    const total = photos.length;
    res.json({
      portrait, landscape, square, unknown,
      total,
      portraitRate: total > 0 ? Math.round((portrait / total) * 100) : 0,
      landscapeRate: total > 0 ? Math.round((landscape / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('By-orientation error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/by-status — Photos grouped by status
router.get('/:eventId/photos/by-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['status'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = grouped.reduce((sum: number, g: any) => sum + g._count.id, 0);
    res.json({
      statuses: grouped.map((g: any) => ({ status: g.status, count: g._count.id, rate: total > 0 ? Math.round((g._count.id / total) * 100) : 0 })),
      total,
    });
  } catch (error: any) {
    logger.error('By-status error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/by-category — Photos grouped by categoryId
router.get('/:eventId/photos/by-category', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['categoryId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    res.json({
      categories: grouped.map((g: any) => ({ categoryId: g.categoryId || null, count: g._count.id })),
      totalCategories: grouped.length,
    });
  } catch (error: any) {
    logger.error('By-category error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/search — Full-text search by title, description, tags, uploadedBy
statsRouteWithReq(router, 'search', 'Photo search', async (eventId, req) => {
  const q = (req.query.q as string || '').trim();
  if (!q) return { photos: [], count: 0, query: q };

  const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);

  const photos = await prisma.photo.findMany({
    where: {
      eventId,
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { uploadedBy: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ],
    },
    select: { id: true, url: true, title: true, description: true, uploadedBy: true, tags: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return { photos, count: photos.length, query: q };
});


// GET /api/events/:eventId/photos/random — Random selection of approved photos
statsRouteWithReq(router, 'random', 'Random photos', async (eventId, req) => {
  const count = Math.min(50, parseInt(req.query.count as string, 10) || 12);

  const total = await prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } });
  const skip = total > count ? Math.floor(Math.random() * (total - count)) : 0;

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, status: 'APPROVED' },
    select: { id: true, url: true, storagePathThumb: true, uploadedBy: true, createdAt: true },
    skip,
    take: count,
  });
  return { photos, count: photos.length, total };
});


// GET /api/events/:eventId/photos/recent — Last N uploaded photos
statsRouteWithReq(router, 'recent', 'Recent photos', async (eventId, req) => {
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { id: true, url: true, status: true, uploadedBy: true, createdAt: true, isFavorite: true, views: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return { photos, count: photos.length };
});


// GET /api/events/:eventId/photos/top — Top photos sorted by views or likes
statsRouteWithReq(router, 'top', 'Top photos', async (eventId, req) => {
  const sortBy = (req.query.sortBy as string) || 'views';
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);

  const orderBy: any = sortBy === 'likes'
    ? { likes: { _count: 'desc' } }
    : { views: 'desc' };

  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { id: true, url: true, views: true, status: true, uploadedBy: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
    orderBy,
    take: limit,
  });
  return { photos, sortBy, count: photos.length };
});


// GET /api/events/:eventId/photos/summary — Aggregated dashboard summary (all key stats)
router.get('/:eventId/photos/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [
      total, approved, pending, rejected,
      favorites, storyOnly, withGeo, deleted,
      totalLikes, totalViews,
    ] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photoLike.count({ where: { photo: { eventId } } }),
      prisma.photo.aggregate({ where: { eventId, deletedAt: null }, _sum: { views: true } }),
    ]);

    const sizeResult = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { sizeBytes: true },
    });

    res.json({
      total, approved, pending, rejected,
      favorites, storyOnly, withGeo, deleted,
      totalLikes,
      totalViews: (totalViews as any)._sum?.views || 0,
      totalSizeMB: sizeResult._sum.sizeBytes ? Math.round(Number(sizeResult._sum.sizeBytes) / 1024 / 1024 * 100) / 100 : 0,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Summary error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/weekday-stats — Uploads per weekday (0=Sun..6=Sat)
statsRoute(router, 'weekday-stats', 'Weekday stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wdMap: Record<number, number> = {};
  for (let d = 0; d < 7; d++) wdMap[d] = 0;
  for (const p of photos) {
    const wd = new Date(p.createdAt).getDay();
    wdMap[wd]++;
  }

  const weekdays = Array.from({ length: 7 }, (_, d) => ({ weekday: d, name: dayNames[d], count: wdMap[d] }));
  return { weekdays, peakDay: weekdays.reduce((a, b) => b.count > a.count ? b : a).name };
});


// GET /api/events/:eventId/photos/daily-stats — Uploads per day (YYYY-MM-DD)
statsRoute(router, 'daily-stats', 'Daily stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const dayMap: Record<string, number> = {};
  for (const p of photos) {
    const key = new Date(p.createdAt).toISOString().split('T')[0];
    dayMap[key] = (dayMap[key] || 0) + 1;
  }

  const days = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));
  return { days, totalDays: days.length };
});


// GET /api/events/:eventId/photos/guest-stats — Photos per guest
router.get('/:eventId/photos/guest-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['guestId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    res.json({
      guestStats: grouped.map((g: any) => ({ guestId: g.guestId || null, count: g._count.id })),
      totalGuests: grouped.length,
    });
  } catch (error: any) {
    logger.error('Guest stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/hash-stats — Hash coverage statistics
router.get('/:eventId/photos/hash-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [total, withMd5, withPerceptual] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, md5Hash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, perceptualHash: { not: null } } }),
    ]);

    res.json({
      total,
      withMd5,
      withPerceptual,
      md5Rate: total > 0 ? Math.round((withMd5 / total) * 100) : 0,
      perceptualRate: total > 0 ? Math.round((withPerceptual / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Hash stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/purge-stats — Photos scheduled for purge
statsRoute(router, 'purge-stats', 'Purge stats', async (eventId) => {
  const now = new Date();
  const [total, scheduledForPurge, alreadyPurgedue] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, purgeAfter: { not: null } } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, purgeAfter: { lt: now } } }),
  ]);
  return { total, scheduledForPurge, alreadyPurgedue, purgeRate: total > 0 ? Math.round((scheduledForPurge / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/deleted-stats — Deleted photo statistics
statsRoute(router, 'deleted-stats', 'Deleted stats', async (eventId) => {
  const [total, deleted, active] = await Promise.all([
    prisma.photo.count({ where: { eventId } }),
    prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
  ]);
  return { total, deleted, active, deletedRate: total > 0 ? Math.round((deleted / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/tag-stats — Top tags for event photos
statsRoute(router, 'tag-stats', 'Tag stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { tags: true },
  });

  const tagMap: Record<string, number> = {};
  for (const p of photos) {
    for (const tag of p.tags) {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));
  return { topTags, totalUniqueTags: Object.keys(tagMap).length };
});


// GET /api/events/:eventId/photos/view-stats — View count statistics
router.get('/:eventId/photos/view-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
      _count: { id: true },
    });

    const topPhoto = await prisma.photo.findFirst({
      where: { eventId, deletedAt: null },
      select: { id: true, views: true, url: true },
      orderBy: { views: 'desc' },
    });

    res.json({
      totalViews: result._sum.views || 0,
      avgViews: Math.round(((result._avg.views || 0) * 100)) / 100,
      maxViews: result._max.views || 0,
      photoCount: result._count.id,
      topPhoto,
    });
  } catch (error: any) {
    logger.error('View stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/like-stats — Photo like statistics
router.get('/:eventId/photos/like-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [totalLikes, photosWithLikes, totalPhotos] = await Promise.all([
      prisma.photoLike.count({ where: { photo: { eventId } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, likes: { some: {} } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
    ]);

    res.json({
      totalLikes,
      photosWithLikes,
      photosWithoutLikes: totalPhotos - photosWithLikes,
      avgLikesPerPhoto: totalPhotos > 0 ? Math.round((totalLikes / totalPhotos) * 100) / 100 : 0,
    });
  } catch (error: any) {
    logger.error('Like stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/favorite-stats — Favorite photo statistics
statsRoute(router, 'favorite-stats', 'Favorite stats', async (eventId) => {
  const [total, favorites] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
  ]);
  return { total, favorites, nonFavorites: total - favorites, favoriteRate: total > 0 ? Math.round((favorites / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/story-only-stats — Story-only photo statistics
statsRoute(router, 'story-only-stats', 'Story-only stats', async (eventId) => {
  const [total, storyOnly, regular] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: false } }),
  ]);
  return { total, storyOnly, regular, storyOnlyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/exif-stats — EXIF data statistics
statsRoute(router, 'exif-stats', 'EXIF stats', async (eventId) => {
  const [total, withExif] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, exifData: { not: 'JsonNull' as any } } }),
  ]);
  return { total, withExif, withoutExif: total - withExif, exifRate: total > 0 ? Math.round((withExif / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/geo-stats — Geo-tagged photo statistics
statsRoute(router, 'geo-stats', 'Geo stats', async (eventId) => {
  const [total, withGeo] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } } }),
  ]);
  return { total, withGeo, withoutGeo: total - withGeo, geoRate: total > 0 ? Math.round((withGeo / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/quality-stats — Quality score statistics
router.get('/:eventId/photos/quality-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _max: { qualityScore: true },
      _min: { qualityScore: true },
      _count: { id: true },
    });

    const withFaces = await prisma.photo.count({
      where: { eventId, deletedAt: null, faceCount: { gt: 0 } },
    });

    res.json({
      avgQualityScore: Math.round(((result._avg.qualityScore || 0) * 100)) / 100,
      maxQualityScore: result._max.qualityScore || 0,
      minQualityScore: result._min.qualityScore || 0,
      photosWithScore: result._count.id,
      photosWithFaces: withFaces,
    });
  } catch (error: any) {
    logger.error('Quality stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/uploader-stats — Photos grouped by uploadedBy
router.get('/:eventId/photos/uploader-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    res.json({
      uploaderStats: grouped.map((g: any) => ({ uploadedBy: g.uploadedBy || 'Anonym', count: g._count.id })),
    });
  } catch (error: any) {
    logger.error('Uploader stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/size-stats — File size statistics for event photos
router.get('/:eventId/photos/size-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { sizeBytes: true },
      _avg: { sizeBytes: true },
      _max: { sizeBytes: true },
      _min: { sizeBytes: true },
      _count: { id: true },
    });

    const toMB = (n: bigint | number | null) => n ? Math.round(Number(n) / 1024 / 1024 * 100) / 100 : 0;

    res.json({
      totalSizeMB: toMB(result._sum.sizeBytes),
      avgSizeMB: toMB(result._avg.sizeBytes),
      maxSizeMB: toMB(result._max.sizeBytes),
      minSizeMB: toMB(result._min.sizeBytes),
      photoCount: result._count.id,
    });
  } catch (error: any) {
    logger.error('Size stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/monthly-stats — Uploads per month
statsRoute(router, 'monthly-stats', 'Monthly stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const monthMap: Record<string, number> = {};
  for (const p of photos) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  }

  const months = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
  return { months, totalMonths: months.length };
});


// GET /api/events/:eventId/photos/weekly-stats — Uploads per week (last 8 weeks)
statsRoute(router, 'weekly-stats', 'Weekly stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const weekMap: Record<string, number> = {};
  for (const p of photos) {
    const d = new Date(p.createdAt);
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = monday.toISOString().split('T')[0];
    weekMap[key] = (weekMap[key] || 0) + 1;
  }

  const weeks = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
  return { weeks, totalWeeks: weeks.length };
});


// GET /api/events/:eventId/photos/status-timeline — Recent status changes (updatedAt desc)
statsRouteWithReq(router, 'status-timeline', 'Status timeline', async (eventId, req) => {
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { id: true, status: true, uploadedBy: true, updatedAt: true, url: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  return { photos, count: photos.length };
});

router.get('/:eventId/photos/votes-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const [totalVotes, photosWithVotes, avgRatingResult] = await Promise.all([
      prisma.photoVote.count({ where: { photo: { eventId } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, votes: { some: {} } } }),
      prisma.photoVote.aggregate({ where: { photo: { eventId } }, _avg: { rating: true } }),
    ]);

    res.json({
      totalVotes,
      photosWithVotes,
      avgRating: Math.round(((avgRatingResult._avg.rating || 0) * 10)) / 10,
    });
  } catch (error: any) {
    logger.error('Votes stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/comments-count — Total comments on approved photos
statsRoute(router, 'comments-count', 'Comments count', async (eventId) => {
  const [totalComments, photosWithComments] = await Promise.all([
    prisma.photoComment.count({ where: { photo: { eventId, deletedAt: null } } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, comments: { some: {} } } }),
  ]);
  return { totalComments, photosWithComments };
});


// GET /api/events/:eventId/photos/views-total — Total view count for event
router.get('/:eventId/photos/views-total', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
      _count: { id: true },
    });

    res.json({
      totalViews: result._sum.views || 0,
      avgViews: Math.round((result._avg.views || 0) * 10) / 10,
      maxViews: result._max.views || 0,
      photoCount: result._count.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler' });
  }
});


// GET /api/events/:eventId/photos/favorites-count — Count of pinned/favorite photos
statsRoute(router, 'favorites-count', 'Unknown', async (eventId) => {
  const [total, favorites] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED', isFavorite: true } }),
  ]);
  return { total, favorites, ratio: total > 0 ? Math.round((favorites / total) * 100) : 0 };
});


// GET /api/events/:eventId/photos/approval-rate — Approval rate stats
statsRoute(router, 'approval-rate', 'Unknown', async (eventId) => {
  const [total, approved, pending, rejected] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' } }),
    prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' } }),
  ]);

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  return { total, approved, pending, rejected, approvalRate };
});


// GET /api/events/:eventId/photos/daily-stats — Uploads per day
router.get('/:eventId/photos/daily-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (const p of photos) {
      const day = new Date(p.createdAt).toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    res.json({
      dailyStats: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
      totalDays: dailyMap.size,
    });
  } catch (error: any) {
    logger.error('Daily stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});


// GET /api/events/:eventId/photos/leaderboard — Top uploaders leaderboard
router.get('/:eventId/photos/leaderboard', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, status: 'APPROVED', deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    res.json({
      leaderboard: grouped.map((g: any, i: number) => ({
        rank: i + 1,
        name: g.uploadedBy || 'Anonym',
        count: g._count.id,
      })),
    });
  } catch (error: any) {
    logger.error('Leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});


// GET /api/events/:eventId/photos/tag-stats — Tag usage statistics
statsRoute(router, 'tag-stats', 'Tag stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { tags: true },
  });

  const tagMap = new Map<string, number>();
  for (const p of photos) {
    for (const tag of (p.tags || [])) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }

  const tagStats = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
  return { tagStats };
});


// GET /api/events/:eventId/photos/status-count — Count by status
statsRoute(router, 'status-count', 'Unknown', async (eventId) => {
  const grouped = await prisma.photo.groupBy({
    by: ['status'],
    where: { eventId, deletedAt: null },
    _count: { id: true },
  });

  const result: Record<string, number> = {};
  for (const g of grouped) result[g.status] = g._count.id;
  return { statusCount: result };
});


// GET /api/events/:eventId/photos/by-guest — Photo count grouped by uploadedBy
router.get('/:eventId/photos/by-guest', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    res.json({
      byGuest: grouped.map((g: any) => ({
        uploadedBy: g.uploadedBy || 'Anonym',
        count: g._count.id,
      })),
    });
  } catch (error: any) {
    logger.error('Photos by guest error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});


// GET /api/events/:eventId/photos/recent — Most recent uploads
publicStatsRoute(router, 'recent', 'Recent photos', async (eventId, req) => {
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 12);
  const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null, status: isManager ? undefined : 'APPROVED' },
    select: { id: true, url: true, uploadedBy: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return { photos };
});


// GET /api/events/:eventId/photos/top-liked — Top liked photos
router.get('/:eventId/photos/top-liked', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);

    const photos = await prisma.photo.findMany({
      where: { eventId, status: 'APPROVED', deletedAt: null },
      select: { id: true, url: true, uploadedBy: true, isFavorite: true, createdAt: true, _count: { select: { likes: true } } },
      orderBy: { likes: { _count: 'desc' } } as any,
      take: limit,
    });

    res.json({ photos });
  } catch (error: any) {
    logger.error('Top liked error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});


// GET /api/events/:eventId/photos/download-stats — Top downloaded photos
statsRoute(router, 'download-stats', 'Download stats', async (eventId) => {
  const photos = await prisma.photo.findMany({
    where: { eventId, deletedAt: null },
    select: { id: true, uploadedBy: true, views: true, likes: true, createdAt: true },
    orderBy: { views: 'desc' },
    take: 20,
  });

  const totalViews = photos.reduce((s, p) => s + (p.views || 0), 0);
  return { topPhotos: photos, totalViews };
});


// GET /api/events/:eventId/photos/export-csv — Export photo list as CSV
router.get('/:eventId/photos/export-csv', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, uploadedBy: true, status: true, createdAt: true, views: true, tags: true },
      orderBy: { createdAt: 'desc' },
    });

    const lines = ['ID,Uploader,Status,Datum,Views,Tags'];
    for (const p of photos) {
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      lines.push(`${p.id},"${(p.uploadedBy || '').replace(/"/g, '')}",${p.status},${date},${p.views || 0},"${(p.tags || []).join(';')}"`);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="photos-${eventId}.csv"`);
    res.send(lines.join('\n'));
  } catch (error: any) {
    logger.error('Photos CSV export error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Export' });
  }
});


// GET /api/events/:eventId/photos/top — Top N photos by likes
publicStatsRoute(router, 'top', 'Top photos', async (eventId, req) => {
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);
  const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
  const photos = await prisma.photo.findMany({
    where: {
      eventId,
      status: isManager ? { not: 'DELETED' as any } : 'APPROVED' as any,
      deletedAt: null,
    },
    select: { id: true, url: true, views: true, uploadedBy: true, createdAt: true },
    orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return { photos: photos.map((p: any) => ({ ...p, url: `/cdn/${p.id}` })) };
});


// GET /api/events/:eventId/photos/tags — All unique tags used in event photos
publicStatsRoute(router, 'tags', 'Tags list', async (eventId, req) => {
  const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
  const photos = await prisma.photo.findMany({
    where: {
      eventId,
      deletedAt: null,
      status: isManager ? { not: 'DELETED' as any } : 'APPROVED' as any,
    },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const photo of photos) {
    for (const tag of (photo.tags || [])) {
      if (tag) tagSet.add(tag);
    }
  }

  const tags = Array.from(tagSet).sort();
  return { tags, count: tags.length };
});


// GET /api/events/:eventId/photos/stats — Photo counts breakdown
statsRoute(router, 'stats', 'Photo stats', async (eventId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, approved, pending, rejected, deleted, favorites, today, totalViews] = await Promise.all([
    prisma.photo.count({ where: { eventId, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, status: 'APPROVED', deletedAt: null } }),
    prisma.photo.count({ where: { eventId, status: 'PENDING', deletedAt: null } }),
    prisma.photo.count({ where: { eventId, status: 'REJECTED', deletedAt: null } }),
    prisma.photo.count({ where: { eventId, status: 'DELETED' } }),
    prisma.photo.count({ where: { eventId, isFavorite: true, deletedAt: null } }),
    prisma.photo.count({ where: { eventId, createdAt: { gte: todayStart }, deletedAt: null } }),
    prisma.photo.aggregate({ where: { eventId, deletedAt: null }, _sum: { views: true } }),
  ]);
  return { total, approved, pending, rejected, deleted, favorites, today, totalViews: totalViews._sum.views || 0 };
});


// GET /api/events/:eventId/photos/by-uploader — Photo counts grouped by uploader name
router.get('/:eventId/photos/by-uploader', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Zugriff verweigert' });

    const groups = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null, status: { not: 'DELETED' as any } },
      _count: true,
      orderBy: { _count: { uploadedBy: 'desc' } },
      take: 100,
    });

    res.json({
      uploaders: groups.map(g => ({
        name: g.uploadedBy || 'Anonym',
        count: g._count,
      })),
    });
  } catch (error: any) {
    logger.error('By-uploader error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});


// GET /api/events/:eventId/photos/live-stats — Fotos heute, top Uploader
router.get('/:eventId/photos/live-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayCount, topUploaders, recentActivity] = await Promise.all([
      prisma.photo.count({
        where: { eventId, createdAt: { gte: todayStart }, deletedAt: null },
      }),
      prisma.photo.groupBy({
        by: ['uploadedBy'],
        where: { eventId, deletedAt: null, uploadedBy: { not: null } },
        _count: true,
        orderBy: { _count: { uploadedBy: 'desc' } },
        take: 5,
      }),
      prisma.photo.findMany({
        where: { eventId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      }),
    ]);

    res.json({
      todayCount,
      topUploaders: topUploaders.map(u => ({ name: u.uploadedBy || 'Anonym', count: u._count })),
      lastPhotoAt: recentActivity[0]?.createdAt || null,
    });
  } catch (error: any) {
    logger.error('Live stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der Live-Stats' });
  }
});

export default router;
