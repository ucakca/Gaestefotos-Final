/**
 * Workflow Executor — Processes workflow steps for events.
 * 
 * Supported step types (Sprint 18 — fully executable):
 * - AI_CATEGORIZE_PHOTO: Uses LLM to auto-categorize photos into albums
 * - AI_MODIFY: Style Transfer via Replicate/Stability
 * - AI_BG_REMOVAL: Background removal via configured provider
 * - QUALITY_GATE: Photo quality check (blur, resolution, duplicate)
 * - ADD_TAG: Add tags to a photo
 * - MOVE_TO_ALBUM: Move photo to a specific album/category
 * - SEND_EMAIL: Sends templated emails to host/guests
 * - SEND_NOTIFICATION: Sends push notifications
 * - WEBHOOK: Call external URL with event data
 * - PRINT_JOB: Create print job for print terminal
 * - DELAY: Wait for a specified duration
 * - CONDITION: Evaluate conditions and branch
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { generateCompletion } from '../lib/groq';
import { emailService } from './email';
import axios from 'axios';

const LOG = '[workflow-executor]';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowNode {
  id: string;
  type: string;
  data: {
    type: string;
    label?: string;
    config?: Record<string, any>;
  };
  position?: { x: number; y: number };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface ExecutionContext {
  eventId: string;
  triggeredBy: string; // 'timer' | 'photo_upload' | 'manual'
  photoId?: string;
  guestId?: string;
  uploadSource?: string; // 'guest' | 'booth' | 'photographer' | 'hashtag'
}

interface StepResult {
  success: boolean;
  message: string;
  data?: any;
}

// ─── Graph Helpers ──────────────────────────────────────────────────────────

function parseGraph(steps: any): WorkflowGraph {
  if (!steps) return { nodes: [], edges: [] };
  if (steps.nodes && Array.isArray(steps.nodes)) {
    return { nodes: steps.nodes, edges: steps.edges || [] };
  }
  // Legacy: flat array of steps
  if (Array.isArray(steps)) {
    return {
      nodes: steps.map((s: any, i: number) => ({
        id: s.id || `step-${i}`,
        type: s.type,
        data: s,
      })),
      edges: steps.slice(1).map((s: any, i: number) => ({
        id: `edge-${i}`,
        source: steps[i].id || `step-${i}`,
        target: s.id || `step-${i + 1}`,
      })),
    };
  }
  return { nodes: [], edges: [] };
}

function getDownstreamNodes(graph: WorkflowGraph, sourceId: string, handleFilter?: string): WorkflowNode[] {
  const targetIds = graph.edges
    .filter(e => e.source === sourceId && (handleFilter === undefined || e.sourceHandle === handleFilter))
    .map(e => e.target);
  return graph.nodes.filter(n => targetIds.includes(n.id));
}

function getConditionalDownstream(graph: WorkflowGraph, nodeId: string, conditionResult: boolean): WorkflowNode[] {
  const handle = conditionResult ? 'then' : 'else';
  const nodes = getDownstreamNodes(graph, nodeId, handle);
  // Fallback: if no handle-specific edges, use 'default' or all edges
  if (nodes.length === 0) {
    return getDownstreamNodes(graph, nodeId, conditionResult ? 'default' : undefined);
  }
  return nodes;
}

function findTriggerNodes(graph: WorkflowGraph, triggerType: string): WorkflowNode[] {
  return graph.nodes.filter(n => {
    const t = n.data?.type || n.type;
    return t === triggerType;
  });
}

/**
 * Check if a trigger node's config matches the current execution context.
 * Used to filter automations by source (e.g., only run for booth uploads).
 */
function triggerMatchesContext(trigger: WorkflowNode, ctx: ExecutionContext): boolean {
  const config = trigger.data?.config || {};
  const triggerType = trigger.data?.type || trigger.type;

  // TRIGGER_PHOTO_UPLOADED: filter by source
  if (triggerType === 'TRIGGER_PHOTO_UPLOADED' || triggerType === 'TRIGGER_PHOTO_UPLOAD') {
    const source = config.source || 'any';
    if (source === 'any') return true;
    if (!ctx.uploadSource) return true; // Unknown source — don't filter out
    return source === ctx.uploadSource;
  }

  // All other triggers: always match (no source filter)
  return true;
}

// ─── Step Executors ─────────────────────────────────────────────────────────

async function executeAiCategorizePhoto(ctx: ExecutionContext, config: any): Promise<StepResult> {
  if (!ctx.photoId) {
    return { success: false, message: 'No photoId in context' };
  }

  const photo = await prisma.photo.findUnique({
    where: { id: ctx.photoId },
    select: { id: true, tags: true, categoryId: true, eventId: true },
  });
  if (!photo) return { success: false, message: 'Photo not found' };

  // Already categorized?
  if (photo.categoryId) {
    return { success: true, message: 'Already categorized', data: { categoryId: photo.categoryId } };
  }

  // Get available categories for this event
  const categories = await prisma.category.findMany({
    where: { eventId: ctx.eventId },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  });

  if (categories.length === 0) {
    return { success: true, message: 'No categories defined for event' };
  }

  // Use AI to pick the best category based on tags and photo metadata
  const tags = photo.tags || [];
  const categoryNames = categories.map(c => c.name);

  try {
    const response = await generateCompletion(
      `Ein Foto hat folgende Tags/Metadaten: ${tags.length > 0 ? tags.join(', ') : 'keine Tags'}.
Die verfügbaren Alben sind: ${categoryNames.join(', ')}.
Wähle das passendste Album. Antworte NUR mit dem exakten Album-Namen, nichts anderes.
Falls kein Album passt, antworte mit: ${categoryNames[0]}`,
      'Du bist ein Foto-Kategorisierungs-Assistent. Ordne Fotos dem passendsten Album zu.',
      { temperature: 0.2, maxTokens: 50 }
    );

    const chosenName = response.content.trim().replace(/"/g, '');
    const match = categories.find(c =>
      c.name.toLowerCase() === chosenName.toLowerCase()
    ) || categories[0];

    await prisma.photo.update({
      where: { id: ctx.photoId },
      data: { categoryId: match.id },
    });

    logger.info(`${LOG} AI categorized photo`, {
      photoId: ctx.photoId,
      category: match.name,
      aiChoice: chosenName,
    });

    return { success: true, message: `Categorized as "${match.name}"`, data: { categoryId: match.id } };
  } catch (error: any) {
    logger.error(`${LOG} AI categorize failed`, { photoId: ctx.photoId, error: error.message });
    // Fallback: assign to first category
    if (config?.fallbackToFirst !== false) {
      await prisma.photo.update({
        where: { id: ctx.photoId },
        data: { categoryId: categories[0].id },
      });
      return { success: true, message: `Fallback to "${categories[0].name}"` };
    }
    return { success: false, message: error.message };
  }
}

async function executeSendEmail(ctx: ExecutionContext, config: any): Promise<StepResult> {
  // Support both 'to' (UI) and 'recipient' (legacy) key names
  const recipient = config?.to || config?.recipient;
  const subject = config?.subject;
  const body = config?.body;
  // Support both 'template' (UI) and 'templateKind' (legacy)
  const templateKind = config?.templateKind || config?.template;

  const event = await prisma.event.findUnique({
    where: { id: ctx.eventId },
    select: {
      id: true, title: true, slug: true, dateTime: true,
      host: { select: { email: true, name: true } },
    },
  });
  if (!event) return { success: false, message: 'Event not found' };

  const variables = {
    eventTitle: event.title || '',
    eventSlug: event.slug || '',
    eventDate: event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE') : '',
    hostName: event.host?.name || '',
    photoCount: String(await prisma.photo.count({ where: { eventId: ctx.eventId, status: 'APPROVED' } })),
  };

  // ── Handle 'all_guests' — send to every guest with email + DSGVO opt-in ──
  if (recipient === 'all_guests') {
    const guests = await prisma.guest.findMany({
      where: { eventId: ctx.eventId, email: { not: null }, emailOptIn: true },
      select: { email: true, firstName: true },
    });
    if (guests.length === 0) {
      return { success: true, message: 'all_guests: no guests with email address' };
    }
    let sent = 0;
    for (const g of guests) {
      if (!g.email) continue;
      try {
        await sendToSingleRecipient(g.email, { subject, body, templateKind, variables });
        sent++;
      } catch (err: any) {
        logger.warn(`${LOG} SEND_EMAIL all_guests failed for ${g.email}`, { error: err.message });
      }
    }
    return { success: true, message: `Email sent to ${sent}/${guests.length} guests` };
  }

  // ── Single recipient ──
  let toEmail: string | null = null;
  if (recipient === 'host' && event.host?.email) {
    toEmail = event.host.email;
  } else if (recipient === 'guest' && ctx.guestId) {
    const guest = await prisma.guest.findUnique({ where: { id: ctx.guestId }, select: { email: true } });
    toEmail = guest?.email || null;
  } else if (typeof recipient === 'string' && recipient.includes('@')) {
    toEmail = recipient;
  }

  if (!toEmail) {
    return { success: false, message: `No valid email for recipient: ${recipient}` };
  }

  try {
    await sendToSingleRecipient(toEmail, { subject, body, templateKind, variables });
    return { success: true, message: `Email sent to ${toEmail}` };
  } catch (error: any) {
    logger.error(`${LOG} Send email failed`, { to: toEmail, error: error.message });
    return { success: false, message: error.message };
  }
}

async function sendToSingleRecipient(
  toEmail: string,
  opts: { subject?: string; body?: string; templateKind?: string; variables: Record<string, string> }
): Promise<void> {
  const { subject, body, templateKind, variables } = opts;
  // Try DB template first
  if (templateKind && templateKind !== 'notification' && templateKind !== 'gallery_link' && templateKind !== 'thank_you') {
    const tpl = await (prisma as any).emailTemplate?.findFirst?.({ where: { kind: templateKind, isActive: true }, orderBy: { updatedAt: 'desc' } });
    if (tpl) {
      await emailService.sendTemplatedEmail({ to: toEmail, template: { subject: tpl.subject, html: tpl.html, text: tpl.text }, variables });
      return;
    }
  }
  // Inline subject/body
  if (subject) {
    await emailService.sendTemplatedEmail({
      to: toEmail,
      template: {
        subject,
        html: body || `<p>${subject}</p><p>Event: {{eventTitle}}</p><p><a href="https://app.xn--gstefotos-v2a.com/e3/{{eventSlug}}">Zur Galerie</a></p>`,
        text: null,
      },
      variables,
    });
    return;
  }
  throw new Error('No email template or subject/body configured');
}

async function executeSendNotification(ctx: ExecutionContext, config: any): Promise<StepResult> {
  // Support both key variants: UI uses 'to'/'message', legacy uses 'title'/'message'
  const to = config?.to || 'host'; // 'host' | 'admins'
  const messageText = config?.message || config?.body || 'Neue Benachrichtigung';

  try {
    const { notifyEventHost, sendPushToEvent, pushTemplates } = await import('./pushNotification');

    if (to === 'host' || to === 'all') {
      const event = await prisma.event.findUnique({ where: { id: ctx.eventId }, select: { title: true } });
      await notifyEventHost(ctx.eventId, {
        title: event?.title || 'Gästefotos',
        body: messageText,
        data: { type: 'workflow_notification', eventId: ctx.eventId },
      }).catch(() => {});
    }

    if (to === 'guests' || to === 'all') {
      const event = await prisma.event.findUnique({ where: { id: ctx.eventId }, select: { title: true, slug: true } });
      await sendPushToEvent(ctx.eventId, {
        title: event?.title || 'Gästefotos',
        body: messageText,
        data: { type: 'workflow_notification', eventId: ctx.eventId },
      }).catch(() => {});
    }

    if (to === 'admins') {
      const { sendPushToUser } = await import('./pushNotification');
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      for (const admin of admins) {
        await sendPushToUser(admin.id, {
          title: 'Admin-Benachrichtigung',
          body: messageText,
          data: { type: 'workflow_notification', eventId: ctx.eventId },
        }).catch(() => {});
      }
    }
  } catch (importErr: any) {
    logger.warn(`${LOG} Push notification failed (non-critical)`, { error: importErr.message });
  }

  // Log as QA event for tracking
  await prisma.qaLogEvent.create({
    data: {
      level: 'DEBUG',
      type: 'WORKFLOW_NOTIFICATION',
      message: messageText,
      data: { eventId: ctx.eventId, to, config } as any,
    },
  });

  return { success: true, message: `Notification sent (${to}): ${messageText}` };
}

// ─── AI_MODIFY (Style Transfer) ─────────────────────────────────────────────

async function executeAiModify(ctx: ExecutionContext, config: any): Promise<StepResult> {
  if (!ctx.photoId) return { success: false, message: 'No photoId in context' };

  try {
    const photo = await prisma.photo.findUnique({ where: { id: ctx.photoId }, select: { id: true, url: true, eventId: true } });
    if (!photo?.url) return { success: false, message: 'Photo not found or has no URL' };

    const { executeStyleTransfer } = await import('./styleTransfer');
    const style = config?.style || config?.prompt ? 'custom' : 'oil-painting';
    const result = await executeStyleTransfer({
      photoId: ctx.photoId,
      eventId: ctx.eventId,
      style,
      prompt: config?.prompt,
      strength: config?.strength,
    });

    logger.info(`${LOG} AI_MODIFY complete`, { photoId: ctx.photoId, style, durationMs: result.durationMs });
    return { success: true, message: `Style Transfer: ${style} (${result.durationMs}ms)`, data: { outputUrl: result.outputUrl } };
  } catch (error: any) {
    logger.error(`${LOG} AI_MODIFY failed`, { photoId: ctx.photoId, error: error.message });
    return { success: false, message: `Style Transfer fehlgeschlagen: ${error.message}` };
  }
}

// ─── AI_BG_REMOVAL ──────────────────────────────────────────────────────────

async function executeAiBgRemoval(ctx: ExecutionContext, config: any): Promise<StepResult> {
  if (!ctx.photoId) return { success: false, message: 'No photoId in context' };

  try {
    const { processBgRemovalForPhoto } = await import('./bgRemoval');
    const replaceBg = config?.replaceBg || 'transparent';
    const result = await processBgRemovalForPhoto(ctx.photoId, ctx.triggeredBy, {
      replacementColor: replaceBg === 'white' ? '#ffffff' : undefined,
      outputFormat: replaceBg === 'transparent' ? 'png' : 'jpeg',
    });

    logger.info(`${LOG} AI_BG_REMOVAL complete`, { photoId: ctx.photoId });
    return { success: true, message: 'Hintergrund entfernt', data: result };
  } catch (error: any) {
    logger.error(`${LOG} AI_BG_REMOVAL failed`, { photoId: ctx.photoId, error: error.message });
    return { success: false, message: `BG Removal fehlgeschlagen: ${error.message}` };
  }
}

// ─── QUALITY_GATE ───────────────────────────────────────────────────────────

async function executeQualityGate(ctx: ExecutionContext, _config: any): Promise<StepResult> {
  if (!ctx.photoId) return { success: false, message: 'No photoId in context' };

  try {
    const photo = await prisma.photo.findUnique({ where: { id: ctx.photoId }, select: { url: true, storagePath: true } });
    if (!photo?.storagePath) return { success: false, message: 'Photo not found' };

    // Read photo buffer from storage (photo.url may be a relative /cdn/ path)
    const { storageService } = await import('./storage');
    const buffer = await storageService.getFile(photo.storagePath);

    const { runPhotoQualityGate } = await import('./photoQualityGate');
    const result = await runPhotoQualityGate(ctx.eventId, ctx.photoId, buffer);

    logger.info(`${LOG} QUALITY_GATE complete`, { photoId: ctx.photoId, passed: result.passed, blurScore: result.checks.blur.score });
    return {
      success: true,
      message: result.passed ? 'Qualitäts-Check bestanden' : `Abgelehnt: ${result.rejectionReason}`,
      data: { passed: result.passed, checks: result.checks, warnings: result.warnings },
    };
  } catch (error: any) {
    logger.error(`${LOG} QUALITY_GATE failed`, { photoId: ctx.photoId, error: error.message });
    return { success: false, message: `Quality Gate fehlgeschlagen: ${error.message}` };
  }
}

// ─── ADD_TAG ────────────────────────────────────────────────────────────────

async function executeAddTag(ctx: ExecutionContext, config: any): Promise<StepResult> {
  if (!ctx.photoId) return { success: false, message: 'No photoId in context' };

  const tagsToAdd = (config?.tags || config?.tag || '').split(',').map((t: string) => t.trim()).filter(Boolean);
  if (tagsToAdd.length === 0) return { success: false, message: 'Keine Tags konfiguriert' };

  try {
    const photo = await prisma.photo.findUnique({ where: { id: ctx.photoId }, select: { tags: true } });
    const existingTags = photo?.tags || [];
    const mergedTags = [...new Set([...existingTags, ...tagsToAdd])];

    await prisma.photo.update({ where: { id: ctx.photoId }, data: { tags: mergedTags } });

    logger.info(`${LOG} ADD_TAG complete`, { photoId: ctx.photoId, added: tagsToAdd });
    return { success: true, message: `Tags hinzugefügt: ${tagsToAdd.join(', ')}`, data: { tags: mergedTags } };
  } catch (error: any) {
    return { success: false, message: `Tags fehlgeschlagen: ${error.message}` };
  }
}

// ─── MOVE_TO_ALBUM ──────────────────────────────────────────────────────────

async function executeMoveToAlbum(ctx: ExecutionContext, config: any): Promise<StepResult> {
  if (!ctx.photoId) return { success: false, message: 'No photoId in context' };

  const albumName = config?.albumName || config?.categoryName;
  const albumId = config?.albumId || config?.categoryId;

  try {
    let targetId = albumId;

    if (!targetId && albumName) {
      // Find or create category by name
      let category = await prisma.category.findFirst({
        where: { eventId: ctx.eventId, name: { equals: albumName, mode: 'insensitive' } },
      });

      if (!category) {
        const maxOrder = await prisma.category.aggregate({ where: { eventId: ctx.eventId }, _max: { order: true } });
        category = await prisma.category.create({
          data: { eventId: ctx.eventId, name: albumName, order: (maxOrder._max.order || 0) + 1 },
        });
        logger.info(`${LOG} Created album "${albumName}" for event ${ctx.eventId}`);
      }

      targetId = category.id;
    }

    if (!targetId) return { success: false, message: 'Kein Album angegeben (albumName oder albumId)' };

    await prisma.photo.update({ where: { id: ctx.photoId }, data: { categoryId: targetId } });

    logger.info(`${LOG} MOVE_TO_ALBUM complete`, { photoId: ctx.photoId, albumId: targetId });
    return { success: true, message: `In Album verschoben: ${albumName || targetId}` };
  } catch (error: any) {
    return { success: false, message: `Album-Verschiebung fehlgeschlagen: ${error.message}` };
  }
}

// ─── WEBHOOK ────────────────────────────────────────────────────────────────

async function executeWebhook(ctx: ExecutionContext, config: any): Promise<StepResult> {
  const url = config?.url;
  if (!url) return { success: false, message: 'Keine Webhook-URL konfiguriert' };

  try {
    const event = await prisma.event.findUnique({
      where: { id: ctx.eventId },
      select: { id: true, title: true, slug: true },
    });

    const payload = {
      event: 'workflow_step',
      eventId: ctx.eventId,
      eventTitle: event?.title,
      eventSlug: event?.slug,
      photoId: ctx.photoId,
      guestId: ctx.guestId,
      triggeredBy: ctx.triggeredBy,
      timestamp: new Date().toISOString(),
      ...(config?.extraData || {}),
    };

    const method = (config?.method || 'POST').toUpperCase();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config?.authHeader) headers['Authorization'] = config.authHeader;

    const response = await axios({
      method,
      url,
      data: method !== 'GET' ? payload : undefined,
      params: method === 'GET' ? payload : undefined,
      headers,
      timeout: config?.timeoutMs || 10000,
    });

    logger.info(`${LOG} WEBHOOK complete`, { url, status: response.status });
    return { success: true, message: `Webhook ${response.status}: ${url}`, data: { status: response.status } };
  } catch (error: any) {
    logger.error(`${LOG} WEBHOOK failed`, { url, error: error.message });
    return { success: false, message: `Webhook fehlgeschlagen: ${error.message}` };
  }
}

// ─── PRINT_JOB ──────────────────────────────────────────────────────────────

async function executePrintJob(ctx: ExecutionContext, config: any): Promise<StepResult> {
  if (!ctx.photoId) return { success: false, message: 'No photoId in context' };

  try {
    const photo = await prisma.photo.findUnique({ where: { id: ctx.photoId }, select: { url: true } });
    if (!photo?.url) return { success: false, message: 'Photo not found' };

    // Create a print job entry (to be picked up by print terminal)
    await prisma.qaLogEvent.create({
      data: {
        level: 'DEBUG',
        type: 'PRINT_JOB_CREATED',
        message: `Druckauftrag erstellt für Foto ${ctx.photoId}`,
        data: {
          eventId: ctx.eventId,
          photoId: ctx.photoId,
          photoUrl: photo.url,
          copies: config?.copies || 1,
          size: config?.size || 'standard',
          quality: config?.quality || 'high',
          source: 'workflow',
        } as any,
      },
    });

    logger.info(`${LOG} PRINT_JOB created`, { photoId: ctx.photoId, copies: config?.copies || 1 });
    return { success: true, message: `Druckauftrag erstellt (${config?.copies || 1}x ${config?.size || 'standard'})` };
  } catch (error: any) {
    return { success: false, message: `Druckauftrag fehlgeschlagen: ${error.message}` };
  }
}

// ─── DELAY ──────────────────────────────────────────────────────────────────

async function executeDelay(_ctx: ExecutionContext, config: any): Promise<StepResult> {
  const duration = config?.duration || 5;
  const unit = config?.unit || 'seconds';

  let ms = duration * 1000;
  if (unit === 'minutes') ms = duration * 60 * 1000;
  if (unit === 'hours') ms = duration * 60 * 60 * 1000;

  // Cap at 5 minutes for safety (synchronous step — use TRIGGER_TIMER for longer delays)
  const maxMs = 5 * 60 * 1000;
  const actualMs = Math.min(ms, maxMs);
  const wasCapped = ms > maxMs;

  if (wasCapped) {
    logger.warn(`${LOG} DELAY capped at 5min (requested: ${duration} ${unit}). Use TRIGGER_TIMER with after_event_end for longer delays.`);
  }

  await new Promise(resolve => setTimeout(resolve, actualMs));

  return {
    success: true,
    message: wasCapped
      ? `Gewartet: 5 Minuten (Cap — angefordert: ${duration} ${unit}). Tipp: TRIGGER_TIMER für lange Verzögerungen verwenden.`
      : `Gewartet: ${duration} ${unit} (${actualMs}ms)`,
  };
}

// ─── CONDITION ───────────────────────────────────────────────────────────────

async function evaluateCondition(ctx: ExecutionContext, config: any): Promise<{ result: boolean; message: string }> {
  const { field, operator, value } = config || {};

  if (!field) return { result: true, message: 'No condition field — passing through' };

  let fieldValue: any = null;

  // Resolve field value from context using REAL data
  if (ctx.photoId) {
    const photo = await prisma.photo.findUnique({
      where: { id: ctx.photoId },
      select: { tags: true, categoryId: true, status: true, sizeBytes: true, faceCount: true, uploadedBy: true },
    });

    switch (field) {
      case 'has_face':
        fieldValue = (photo?.faceCount ?? 0) > 0;
        break;
      case 'is_duplicate':
        // Check if photo has 'duplicate' tag (set by quality gate)
        fieldValue = Array.isArray(photo?.tags) && (photo.tags as string[]).includes('duplicate');
        break;
      case 'quality_score': {
        // Derive score from tags: 'blur', 'low-resolution', 'duplicate' lower it
        const tags = Array.isArray(photo?.tags) ? photo!.tags as string[] : [];
        let score = 100;
        if (tags.includes('blur') || tags.includes('blurry')) score -= 40;
        if (tags.includes('low-resolution')) score -= 30;
        if (tags.includes('duplicate')) score -= 20;
        if (tags.includes('quality-rejected')) score = 0;
        fieldValue = Math.max(0, score);
        break;
      }
      case 'file_size':
        fieldValue = photo?.sizeBytes ? Number(photo.sizeBytes) : 0;
        break;
      case 'upload_source':
        fieldValue = photo?.uploadedBy || 'guest';
        break;
      case 'photo_count':
        fieldValue = await prisma.photo.count({ where: { eventId: ctx.eventId, status: 'APPROVED' } });
        break;
      case 'has_consent':
        // consent is handled separately; default true unless explicitly denied
        fieldValue = !Array.isArray(photo?.tags) || !(photo!.tags as string[]).includes('no-consent');
        break;
      default:
        fieldValue = null;
    }
  } else {
    // Non-photo context
    switch (field) {
      case 'photo_count':
        fieldValue = await prisma.photo.count({ where: { eventId: ctx.eventId, status: 'APPROVED' } });
        break;
      default:
        fieldValue = null;
    }
  }

  // Evaluate operator
  let result = false;
  switch (operator) {
    case 'equals': result = String(fieldValue) === String(value); break;
    case 'not_equals': result = String(fieldValue) !== String(value); break;
    case 'greater_than': result = Number(fieldValue) > Number(value); break;
    case 'less_than': result = Number(fieldValue) < Number(value); break;
    case 'contains': result = String(fieldValue).includes(String(value)); break;
    case 'is_true': result = !!fieldValue; break;
    case 'is_false': result = !fieldValue; break;
    default: result = true;
  }

  return { result, message: `${field} ${operator} ${value} → ${result}` };
}

// ─── Step Router ────────────────────────────────────────────────────────────

async function executeStep(node: WorkflowNode, ctx: ExecutionContext): Promise<StepResult> {
  const stepType = node.data?.type || node.type;
  const config = node.data?.config || {};

  switch (stepType) {
    // ── Executable AI Steps ──
    case 'AI_CATEGORIZE_PHOTO':
      return executeAiCategorizePhoto(ctx, config);
    case 'AI_MODIFY':
      return executeAiModify(ctx, config);
    case 'AI_BG_REMOVAL':
      return executeAiBgRemoval(ctx, config);

    // ── Processing Steps ──
    case 'QUALITY_GATE':
      return executeQualityGate(ctx, config);
    case 'ADD_TAG':
      return executeAddTag(ctx, config);
    case 'MOVE_TO_ALBUM':
      return executeMoveToAlbum(ctx, config);

    // ── Communication Steps ──
    case 'SEND_EMAIL':
    case 'EMAIL_SHARE':
      return executeSendEmail(ctx, config);
    case 'SEND_NOTIFICATION':
      return executeSendNotification(ctx, config);

    // ── Integration Steps ──
    case 'WEBHOOK':
      return executeWebhook(ctx, config);
    case 'PRINT':
    case 'PRINT_JOB':
      return executePrintJob(ctx, config);
    case 'DELAY':
      return executeDelay(ctx, config);

    // ── Condition (evaluates and returns result for branching) ──
    case 'CONDITION': {
      const cond = await evaluateCondition(ctx, config);
      return { success: cond.result, message: cond.message, data: { conditionResult: cond.result } };
    }

    // ── Trigger nodes — entry points, no execution ──
    case 'TRIGGER_PHOTO_UPLOADED':
    case 'TRIGGER_PHOTO_UPLOAD':
    case 'TRIGGER_PHOTO_APPROVED':
    case 'TRIGGER_PHOTO_REJECTED':
    case 'TRIGGER_TIMER':
    case 'TRIGGER_GUEST_JOINED':
    case 'TRIGGER_EVENT_START':
    case 'TRIGGER_EVENT_END':
    case 'TRIGGER_EVENT_STATE':
    case 'TRIGGER_MANUAL':
    case 'TRIGGER_QR_SCAN':
      return { success: true, message: `Trigger: ${stepType}` };

    // ── UI-only steps (documentation, no server execution) ──
    case 'TOUCH_TO_START':
    case 'BEFORE_COUNTDOWN':
    case 'COUNTDOWN':
    case 'COMPLIMENT':
    case 'AFTER_SHARE':
    case 'TAKE_PHOTO':
    case 'SELECTION_SCREEN':
    case 'DIGITAL_GRAFFITI':
    case 'FOTO_SPIEL':
    case 'LED_RING':
    case 'BOOTH_DISPLAY':
    case 'QR_CODE':
    case 'SMS_SHARE':
    case 'FACE_SEARCH':
    case 'GALLERY_EMBED':
    case 'SLIDESHOW':
    case 'ZIP_DOWNLOAD':
    case 'LEAD_COLLECTION':
      return { success: true, message: `UI-Step (Doku): ${stepType}` };

    default:
      logger.warn(`${LOG} Unknown step type: ${stepType}`);
      return { success: true, message: `Skipped unknown step: ${stepType}` };
  }
}

// ─── Main Execution ─────────────────────────────────────────────────────────

/**
 * Execute a workflow starting from a specific trigger type.
 * Follows edges to execute downstream steps in order.
 */
export async function executeWorkflow(
  workflowId: string,
  triggerType: string,
  ctx: ExecutionContext
): Promise<{ executed: number; results: StepResult[] }> {
  const workflow = await prisma.boothWorkflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    logger.warn(`${LOG} Workflow not found: ${workflowId}`);
    return { executed: 0, results: [] };
  }

  const graph = parseGraph(workflow.steps);
  const triggers = findTriggerNodes(graph, triggerType);

  if (triggers.length === 0) {
    return { executed: 0, results: [] };
  }

  const results: StepResult[] = [];
  const visited = new Set<string>();

  // BFS from each trigger node
  const queue: WorkflowNode[] = [];
  for (const trigger of triggers) {
    const downstream = getDownstreamNodes(graph, trigger.id);
    queue.push(...downstream);
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    try {
      const result = await executeStep(node, ctx);
      results.push(result);

      logger.info(`${LOG} Step executed`, {
        workflowId,
        stepType: node.data?.type || node.type,
        stepLabel: node.data?.label,
        success: result.success,
        message: result.message,
      });

      // Continue to downstream nodes (with CONDITION branching)
      const stepType = node.data?.type || node.type;
      if (stepType === 'CONDITION' && result.data?.conditionResult !== undefined) {
        const downstream = getConditionalDownstream(graph, node.id, result.data.conditionResult);
        queue.push(...downstream);
      } else if (result.success) {
        const downstream = getDownstreamNodes(graph, node.id);
        queue.push(...downstream);
      }
    } catch (error: any) {
      logger.error(`${LOG} Step execution failed`, {
        workflowId,
        nodeId: node.id,
        error: error.message,
      });
      results.push({ success: false, message: error.message });
    }
  }

  // Log execution
  await prisma.qaLogEvent.create({
    data: {
      level: 'DEBUG',
      type: 'WORKFLOW_EXECUTED',
      message: `Workflow "${workflow.name}" ausgeführt (${results.length} Steps, Trigger: ${triggerType})`,
      data: {
        workflowId,
        eventId: ctx.eventId,
        triggerType,
        stepsExecuted: results.length,
        results: results.map(r => ({ success: r.success, message: r.message })),
      } as any,
    },
  });

  return { executed: results.length, results };
}

/**
 * Trigger workflow execution when a photo is uploaded.
 * 1. Runs event-specific workflow (event.workflowId) if assigned
 * 2. Runs ALL active AUTOMATION workflows with TRIGGER_PHOTO_UPLOADED
 */
export async function onPhotoUploaded(eventId: string, photoId: string, uploadSource?: string): Promise<void> {
  try {
    const ctx: ExecutionContext = { eventId, triggeredBy: 'photo_upload', photoId, uploadSource: uploadSource || 'guest' };

    // 1. Event-specific workflow (Booth-Flow etc.)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { workflowId: true },
    });

    if (event?.workflowId) {
      await executeWorkflow(event.workflowId, 'TRIGGER_PHOTO_UPLOADED', ctx);
    }

    // 2. Global + event-specific AUTOMATION workflows
    await runAutomations('TRIGGER_PHOTO_UPLOADED', ctx);
  } catch (error: any) {
    // Never let workflow errors break photo upload
    logger.error(`${LOG} onPhotoUploaded error`, { eventId, photoId, error: error.message });
  }
}

/**
 * Trigger workflow execution for event lifecycle events.
 * Runs global + event-specific AUTOMATION workflows matching the trigger type.
 */
export async function onEventTrigger(
  eventId: string,
  triggerType: 'TRIGGER_EVENT_START' | 'TRIGGER_EVENT_END' | 'TRIGGER_GUEST_JOINED' | 'TRIGGER_PHOTO_APPROVED' | 'TRIGGER_PHOTO_REJECTED',
  extra?: { guestId?: string }
): Promise<void> {
  try {
    const ctx: ExecutionContext = { eventId, triggeredBy: triggerType, ...extra };
    await runAutomations(triggerType, ctx);
  } catch (error: any) {
    logger.error(`${LOG} onEventTrigger error`, { eventId, triggerType, error: error.message });
  }
}

/**
 * Find and execute all matching AUTOMATION workflows for an event:
 * 1. Global automations (isGlobal=true, isActive=true) → run for ALL events
 * 2. Event-specific automations (via EventAutomation join table, isActive=true)
 * Deduplicates so a workflow only runs once even if both global and assigned.
 */
async function runAutomations(triggerType: string, ctx: ExecutionContext): Promise<void> {
  const executedIds = new Set<string>();

  // 1. Global automations
  const globalAutomations = await prisma.boothWorkflow.findMany({
    where: { flowType: 'AUTOMATION', isActive: true, isGlobal: true } as any,
    select: { id: true, name: true, steps: true },
  });

  for (const wf of globalAutomations) {
    const graph = parseGraph(wf.steps);
    const triggers = findTriggerNodes(graph, triggerType);
    const matchingTriggers = triggers.filter(t => triggerMatchesContext(t, ctx));
    if (matchingTriggers.length === 0) continue;

    executedIds.add(wf.id);
    logger.info(`${LOG} Running global automation "${wf.name}" for ${triggerType}`, { eventId: ctx.eventId });
    try {
      await executeWorkflow(wf.id, triggerType, ctx);
    } catch (err: any) {
      logger.error(`${LOG} Global automation "${wf.name}" failed`, { error: err.message });
    }
  }

  // 2. Event-specific automations (via EventAutomation join table)
  const eventAutomations = await (prisma as any).eventAutomation.findMany({
    where: { eventId: ctx.eventId, isActive: true },
    include: {
      workflow: { select: { id: true, name: true, steps: true, isActive: true, flowType: true } },
    },
  });

  for (const ea of eventAutomations) {
    const wf = ea.workflow;
    if (!wf.isActive || wf.flowType !== 'AUTOMATION') continue;
    if (executedIds.has(wf.id)) continue; // Already ran as global

    const graph = parseGraph(wf.steps);
    const triggers = findTriggerNodes(graph, triggerType);
    const matchingTriggers = triggers.filter(t => triggerMatchesContext(t, ctx));
    if (matchingTriggers.length === 0) continue;

    executedIds.add(wf.id);
    logger.info(`${LOG} Running event automation "${wf.name}" for ${triggerType}`, { eventId: ctx.eventId });
    try {
      await executeWorkflow(wf.id, triggerType, ctx);
    } catch (err: any) {
      logger.error(`${LOG} Event automation "${wf.name}" failed`, { error: err.message });
    }
  }
}
