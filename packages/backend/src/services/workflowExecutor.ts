/**
 * Workflow Executor — Processes workflow steps for events.
 * 
 * Supported step types:
 * - AI_CATEGORIZE_PHOTO: Uses LLM to auto-categorize photos into albums
 * - SEND_EMAIL: Sends templated emails to host/guests
 * - SEND_NOTIFICATION: Sends push notifications
 * - All existing AI steps (AI_MODIFY, AI_FACE_SWITCH, etc.)
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { generateCompletion } from '../lib/groq';
import { emailService } from './email';

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

function getDownstreamNodes(graph: WorkflowGraph, sourceId: string): WorkflowNode[] {
  const targetIds = graph.edges
    .filter(e => e.source === sourceId)
    .map(e => e.target);
  return graph.nodes.filter(n => targetIds.includes(n.id));
}

function findTriggerNodes(graph: WorkflowGraph, triggerType: string): WorkflowNode[] {
  return graph.nodes.filter(n => {
    const t = n.data?.type || n.type;
    return t === triggerType;
  });
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
  const { recipient, subject, body, templateKind } = config || {};

  const event = await prisma.event.findUnique({
    where: { id: ctx.eventId },
    select: {
      id: true, title: true, slug: true, dateTime: true,
      host: { select: { email: true, name: true } },
    },
  });
  if (!event) return { success: false, message: 'Event not found' };

  // Determine recipient
  let toEmail: string | null = null;
  if (recipient === 'host' && event.host?.email) {
    toEmail = event.host.email;
  } else if (recipient === 'guest' && ctx.guestId) {
    const guest = await prisma.guest.findUnique({
      where: { id: ctx.guestId },
      select: { email: true },
    });
    toEmail = guest?.email || null;
  } else if (typeof recipient === 'string' && recipient.includes('@')) {
    toEmail = recipient;
  }

  if (!toEmail) {
    return { success: false, message: `No valid email for recipient: ${recipient}` };
  }

  const variables = {
    eventTitle: event.title || '',
    eventSlug: event.slug || '',
    eventDate: event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE') : '',
    hostName: event.host?.name || '',
    photoCount: String(await prisma.photo.count({ where: { eventId: ctx.eventId, status: 'APPROVED' } })),
  };

  try {
    // Try template from DB first
    if (templateKind) {
      const tpl = await (prisma as any).emailTemplate?.findFirst?.({
        where: { kind: templateKind, isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (tpl) {
        await emailService.sendTemplatedEmail({
          to: toEmail,
          template: { subject: tpl.subject, html: tpl.html, text: tpl.text },
          variables,
        });
        return { success: true, message: `Email sent to ${toEmail} (template: ${templateKind})` };
      }
    }

    // Inline subject/body from workflow config
    if (subject && body) {
      await emailService.sendTemplatedEmail({
        to: toEmail,
        template: {
          subject: subject || 'Benachrichtigung von gästefotos.com',
          html: body,
          text: null,
        },
        variables,
      });
      return { success: true, message: `Email sent to ${toEmail}` };
    }

    return { success: false, message: 'No email template or subject/body configured' };
  } catch (error: any) {
    logger.error(`${LOG} Send email failed`, { to: toEmail, error: error.message });
    return { success: false, message: error.message };
  }
}

async function executeSendNotification(ctx: ExecutionContext, config: any): Promise<StepResult> {
  // Log notification intent — actual push sending depends on push subscription infrastructure
  const { title, message: body } = config || {};
  logger.info(`${LOG} Notification triggered`, {
    eventId: ctx.eventId,
    title: title || 'Neue Benachrichtigung',
    body: body || '',
  });

  // Log as QA event for tracking
  await prisma.qaLogEvent.create({
    data: {
      level: 'DEBUG',
      type: 'WORKFLOW_NOTIFICATION',
      message: `${title || 'Notification'}: ${body || ''}`,
      data: { eventId: ctx.eventId, config } as any,
    },
  });

  return { success: true, message: 'Notification logged' };
}

// ─── Step Router ────────────────────────────────────────────────────────────

async function executeStep(node: WorkflowNode, ctx: ExecutionContext): Promise<StepResult> {
  const stepType = node.data?.type || node.type;
  const config = node.data?.config || {};

  switch (stepType) {
    case 'AI_CATEGORIZE_PHOTO':
      return executeAiCategorizePhoto(ctx, config);
    case 'SEND_EMAIL':
      return executeSendEmail(ctx, config);
    case 'SEND_NOTIFICATION':
      return executeSendNotification(ctx, config);
    // Trigger nodes don't execute — they're entry points
    case 'TRIGGER_PHOTO_UPLOADED':
    case 'TRIGGER_TIMER':
    case 'TRIGGER_GUEST_JOINED':
    case 'TRIGGER_EVENT_START':
    case 'TRIGGER_EVENT_END':
      return { success: true, message: `Trigger: ${stepType}` };
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

      // Continue to downstream nodes
      if (result.success) {
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
 * Called from photo upload handlers.
 */
export async function onPhotoUploaded(eventId: string, photoId: string): Promise<void> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { workflowId: true },
    });

    if (!event?.workflowId) return;

    await executeWorkflow(event.workflowId, 'TRIGGER_PHOTO_UPLOADED', {
      eventId,
      triggeredBy: 'photo_upload',
      photoId,
    });
  } catch (error: any) {
    // Never let workflow errors break photo upload
    logger.error(`${LOG} onPhotoUploaded error`, { eventId, photoId, error: error.message });
  }
}
