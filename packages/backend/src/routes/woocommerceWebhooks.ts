import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { getWordPressUserByEmail } from '../config/wordpress';
import { emailService } from '../services/email';

const router = Router();

type RawBodyRequest = Request & { rawBody?: Buffer };

function hashPayload(raw: Buffer | undefined): string | null {
  if (!raw || raw.length === 0) return null;
  try {
    return crypto.createHash('sha256').update(raw).digest('hex');
  } catch {
    return null;
  }
}

function getWebhookSecret(): string {
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Server misconfigured: WOOCOMMERCE_WEBHOOK_SECRET is missing');
  }
  return secret;
}

function verifyWooSignature(req: RawBodyRequest): boolean {
  const signatureHeader = (req.header('x-wc-webhook-signature') || '').trim();
  if (!signatureHeader) return false;

  const raw = req.rawBody;
  if (!raw || raw.length === 0) return false;

  const secret = getWebhookSecret();
  const computed = crypto.createHmac('sha256', secret).update(raw).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computed));
  } catch {
    return false;
  }
}

const orderPaidSchema = z.object({
  id: z.union([z.number().int(), z.string()]),
  status: z.string().optional(),
  customer_id: z.union([z.number().int(), z.string()]).optional().nullable(),
  billing: z
    .object({
      email: z.string().email().optional().nullable(),
    })
    .optional(),
  meta_data: z
    .array(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .optional(),
  line_items: z
    .array(
      z.object({
        sku: z.string().optional().nullable(),
        product_id: z.union([z.number().int(), z.string()]).optional().nullable(),
        quantity: z.union([z.number().int(), z.string()]).optional().nullable(),
      })
    )
    .optional(),
});

function isPaidOrderStatus(status: unknown): boolean {
  const s = typeof status === 'string' ? status.trim().toLowerCase() : '';
  // WooCommerce typical paid statuses: processing/completed
  return s === 'processing' || s === 'completed';
}

function nonPaidReasonFromStatus(status: unknown): string {
  const s = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (s === 'refunded') return 'order_refunded';
  if (s === 'cancelled' || s === 'canceled') return 'order_cancelled';
  if (s === 'failed') return 'order_failed';
  return 'order_not_paid';
}

function getMetaValue(meta: Array<{ key: string; value: any }> | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  const found = meta.find((m) => m.key === key);
  if (!found) return undefined;
  if (typeof found.value === 'string') return found.value;
  if (typeof found.value === 'number') return String(found.value);
  return undefined;
}

function getMetaValueLoose(meta: Array<{ key: string; value?: any }> | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  const found = meta.find((m) => m.key === key);
  if (!found) return undefined;
  if (typeof found.value === 'string') return found.value;
  if (typeof found.value === 'number') return String(found.value);
  return undefined;
}

export async function processWooOrderPaidWebhook(params: {
  payload: unknown;
  signatureOk: boolean;
  payloadHash: string | null;
  logId?: string | null;
}): Promise<{ httpStatus: number; body: any }>
{
  const { payload: rawPayload, signatureOk, payloadHash, logId } = params;

  try {
    if (!signatureOk) {
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'FORBIDDEN', reason: 'invalid_signature' },
          })
          .catch(() => null);
      }
      return { httpStatus: 403, body: { error: 'Forbidden' } };
    }

    const payload = orderPaidSchema.parse(rawPayload);

    const wcOrderId = String(payload.id);
    const payloadStatus = payload.status;

    if (logId) {
      await (prisma as any).wooWebhookEventLog
        .update({
          where: { id: logId },
          data: { wcOrderId, payloadHash },
        })
        .catch(() => null);
    }

    // Only process paid orders; acknowledge others to avoid webhook retries.
    if (!isPaidOrderStatus(payloadStatus)) {
      const reason = nonPaidReasonFromStatus(payloadStatus);
      logger.info('woocommerce_webhook_ignored', { wcOrderId, reason, payloadStatus });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason } };
    }

    const eventCode = getMetaValueLoose(payload.meta_data, 'eventCode') || getMetaValueLoose(payload.meta_data, 'event_code');

    const lineItems = payload.line_items || [];
    const skus = lineItems.map((li) => (li.sku || '').trim()).filter((v) => v.length > 0);

    if (logId) {
      await (prisma as any).wooWebhookEventLog
        .update({
          where: { id: logId },
          data: { eventCode: eventCode || null, skus },
        })
        .catch(() => null);
    }

    if (skus.length === 0) {
      logger.info('woocommerce_webhook_ignored', { wcOrderId, reason: 'no_sku_in_order_payload' });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason: 'no_sku_in_order_payload' },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason: 'no_sku_in_order_payload' } };
    }

    const activePackages = await prisma.packageDefinition.findMany({
      where: {
        sku: { in: skus },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activePackages.length === 0) {
      logger.info('woocommerce_webhook_ignored', { wcOrderId, reason: 'unknown_package_sku' });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason: 'unknown_package_sku' },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason: 'unknown_package_sku' } };
    }

    // Split into base/upgrade vs addon packages
    const addonPackages = (activePackages as any[]).filter((p: any) => p.type === 'ADDON');
    const basePackages = (activePackages as any[]).filter((p: any) => p.type !== 'ADDON');

    // Prefer UPGRADE packages if present, else BASE
    const pkg =
      basePackages.find((p: any) => p.type === 'UPGRADE') ||
      basePackages.find((p: any) => p.type === 'BASE') ||
      basePackages[0] ||
      (addonPackages.length > 0 ? null : (activePackages as any[])[0]);

    // If only addon packages and no base, we still need an eventCode to attach them
    if (!pkg && addonPackages.length > 0 && !eventCode) {
      logger.info('woocommerce_webhook_ignored', { wcOrderId, reason: 'addon_only_no_event_code' });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason: 'addon_only_no_event_code' },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason: 'addon_only_no_event_code' } };
    }

    const lineItemForPkg = pkg ? lineItems.find((li) => (li.sku || '').trim() === pkg.sku) : null;
    const wcProductIdRaw = lineItemForPkg?.product_id;
    const wcProductId = wcProductIdRaw === null || wcProductIdRaw === undefined ? null : String(wcProductIdRaw);

    if (logId) {
      await (prisma as any).wooWebhookEventLog
        .update({
          where: { id: logId },
          data: { wcProductId, wcSku: pkg?.sku || addonPackages[0]?.sku || null },
        })
        .catch(() => null);
    }

    // Determine wpUserId; Woo uses customer_id when user is logged in.
    const wpUserIdRaw = payload.customer_id;
    let wpUserId = typeof wpUserIdRaw === 'string' ? parseInt(wpUserIdRaw, 10) : wpUserIdRaw;

    // Guest checkout fallback: try to map via billing.email -> WordPress user
    if (!wpUserId || !Number.isFinite(wpUserId)) {
      const email = payload.billing?.email || null;
      if (email) {
        // Prefer local mapping first (works even if WP DB/REST is unavailable)
        const local = await prisma.user.findUnique({
          where: { email },
          select: { wordpressUserId: true },
        });
        if (local?.wordpressUserId) {
          wpUserId = local.wordpressUserId;
        } else {
          try {
            const wpUser = await getWordPressUserByEmail(email);
            if (wpUser) {
              wpUserId = wpUser.id;
            }
          } catch {
            logger.warn('WooCommerce webhook: billing email mapping failed');
          }
        }
      }
    }

    if (!wpUserId || !Number.isFinite(wpUserId)) {
      logger.info('woocommerce_webhook_ignored', {
        wcOrderId,
        reason: 'missing_customer_mapping',
        hasEventCode: !!eventCode,
      });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason: 'missing_customer_mapping' },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason: 'missing_customer_mapping' } };
    }

    if (logId) {
      await (prisma as any).wooWebhookEventLog
        .update({
          where: { id: logId },
          data: { wpUserId },
        })
        .catch(() => null);
    }

    // Idempotency + processing should be in one transaction (avoid receipts without entitlements).
    const processed = await prisma.$transaction(async (tx) => {
      const receiptInsert = await tx.wooWebhookReceipt.createMany({
        data: [{ wcOrderId }],
        skipDuplicates: true,
      });

      if (receiptInsert.count === 0) {
        const existing = await tx.eventEntitlement.findFirst({
          where: {
            wcOrderId,
            source: 'WOOCOMMERCE_ORDER',
          },
          select: { eventId: true },
        });
        return { duplicate: true as const, eventId: existing?.eventId || null, mode: null as any };
      }

      {
        const existing = await tx.eventEntitlement.findFirst({
          where: {
            wcOrderId,
            source: 'WOOCOMMERCE_ORDER',
          },
          select: { eventId: true },
        });
        if (existing) {
          return { duplicate: true as const, eventId: existing?.eventId || null, mode: null as any };
        }
      }

      if (eventCode) {
        const event = await tx.event.findUnique({
          where: { eventCode },
          select: { id: true, hostId: true, deletedAt: true, isActive: true },
        });
        if (!event || event.deletedAt || event.isActive === false) {
          // Rollback receipt insert by throwing; we will handle outside.
          throw Object.assign(new Error('Event not found'), { code: 'EVENT_NOT_FOUND' });
        }

        const host = await tx.user.findUnique({
          where: { id: event.hostId },
          select: { wordpressUserId: true },
        });

        if (!host?.wordpressUserId || host.wordpressUserId !== wpUserId) {
          throw Object.assign(new Error('eventCode_not_owned_by_customer'), { code: 'EVENT_CODE_NOT_OWNED' });
        }

        await tx.eventEntitlement.updateMany({
          where: { eventId: event.id, status: 'ACTIVE' },
          data: { status: 'REPLACED' },
        });

        if (pkg) {
          await tx.eventEntitlement.create({
            data: {
              eventId: event.id,
              wpUserId,
              source: 'WOOCOMMERCE_ORDER',
              wcOrderId,
              wcProductId,
              wcSku: pkg.sku,
              storageLimitBytes: pkg.storageLimitBytes,
              status: 'ACTIVE',
            },
          });
        }

        // Create addon entitlements
        for (const addon of addonPackages) {
          const addonLi = lineItems.find((li) => (li.sku || '').trim() === addon.sku);
          const addonProductId = addonLi?.product_id ? String(addonLi.product_id) : null;
          await tx.eventEntitlement.create({
            data: {
              eventId: event.id,
              wpUserId,
              source: 'addon_woocommerce',
              wcOrderId,
              wcProductId: addonProductId,
              wcSku: addon.sku,
              status: 'ACTIVE',
            },
          });
        }

        return { duplicate: false as const, eventId: event.id, mode: pkg ? 'upgrade' as const : 'addon_only' as const };
      }

      // Create flow: create event then entitlement.
      const title = `Event ${new Date().toISOString().slice(0, 10)} (${pkg.resultingTier})`;

      let owner = await tx.user.findFirst({ where: { wordpressUserId: wpUserId } });
      if (!owner) {
        const email = payload.billing?.email || null;
        if (!email) {
          throw Object.assign(new Error('no_local_user_mapping'), { code: 'NO_LOCAL_USER_MAPPING' });
        }
        const wpUser = await getWordPressUserByEmail(email);
        if (!wpUser || wpUser.id !== wpUserId) {
          throw Object.assign(new Error('no_local_user_mapping'), { code: 'NO_LOCAL_USER_MAPPING' });
        }

        await tx.user.upsert({
          where: { email: wpUser.user_email },
          update: {
            name: wpUser.display_name,
            role: 'ADMIN',
            wordpressUserId: wpUser.id,
          },
          create: {
            email: wpUser.user_email,
            name: wpUser.display_name,
            password: '',
            role: 'ADMIN',
            wordpressUserId: wpUser.id,
          },
        });

        owner = await tx.user.findFirst({ where: { wordpressUserId: wpUserId } });
      }

      if (!owner) {
        throw Object.assign(new Error('no_local_user_mapping'), { code: 'NO_LOCAL_USER_MAPPING' });
      }

      const created = await tx.event.create({
        data: {
          hostId: owner.id,
          slug: `${Math.floor(10000 + Math.random() * 90000)}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          eventCode: crypto.randomBytes(12).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
        },
        select: { id: true, eventCode: true },
      });

      await tx.eventEntitlement.create({
        data: {
          eventId: created.id,
          wpUserId,
          source: 'WOOCOMMERCE_ORDER',
          wcOrderId,
          wcProductId,
          wcSku: pkg!.sku,
          storageLimitBytes: pkg!.storageLimitBytes,
          status: 'ACTIVE',
        },
      });

      // Create addon entitlements for the new event
      for (const addon of addonPackages) {
        const addonLi = lineItems.find((li) => (li.sku || '').trim() === addon.sku);
        const addonProductId = addonLi?.product_id ? String(addonLi.product_id) : null;
        await tx.eventEntitlement.create({
          data: {
            eventId: created.id,
            wpUserId,
            source: 'addon_woocommerce',
            wcOrderId,
            wcProductId: addonProductId,
            wcSku: addon.sku,
            status: 'ACTIVE',
          },
        });
      }

      return { duplicate: false as const, eventId: created.id, mode: 'create' as const };
    });

    if (processed.duplicate) {
      logger.info('woocommerce_webhook_duplicate', { wcOrderId, eventId: processed.eventId });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'PROCESSED', reason: 'duplicate', eventId: processed.eventId },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, duplicate: true, eventId: processed.eventId } };
    }

    if (logId) {
      await (prisma as any).wooWebhookEventLog
        .update({
          where: { id: logId },
          data: { status: 'PROCESSED', eventId: processed.eventId, reason: processed.mode },
        })
        .catch(() => null);
    }

    // ── P1-2: EventAiConfig mit Paket-Defaults erstellen (non-blocking) ──
    // Use actual PackageDefinition energy defaults instead of hardcoded tier map
    const pkgDefaults: Record<string, any> = {};
    if (pkg) {
      pkgDefaults.energyEnabled = pkg.defaultEnergyEnabled ?? true;
      pkgDefaults.energyStartBalance = pkg.defaultEnergyStartBalance ?? 10;
      pkgDefaults.energyCooldownSeconds = pkg.defaultEnergyCooldown ?? 60;
      pkgDefaults.energyCostLlmGame = pkg.defaultCostLlmGame ?? 1;
      pkgDefaults.energyCostImageEffect = pkg.defaultCostImageEffect ?? 2;
      pkgDefaults.energyCostStyleTransfer = pkg.defaultCostStyleTransfer ?? 2;
      pkgDefaults.energyCostFaceSwap = pkg.defaultCostFaceSwap ?? 3;
      pkgDefaults.energyCostGif = pkg.defaultCostGif ?? 3;
      pkgDefaults.energyCostVideo = pkg.defaultCostVideo ?? 5;
      pkgDefaults.energyCostTradingCard = pkg.defaultCostTradingCard ?? 2;
    }
    prisma.eventAiConfig.upsert({
      where: { eventId: processed.eventId },
      create: { eventId: processed.eventId, ...pkgDefaults },
      update: {},
    }).catch((err: any) => logger.warn('WooCommerce: EventAiConfig upsert failed', { error: err.message }));

    // ── P1-1: Briefing-Email an Kunden (non-blocking) ──
    const customerEmail = payload.billing?.email;
    if (customerEmail && processed.eventId) {
      prisma.event.findUnique({
        where: { id: processed.eventId },
        select: { title: true, eventCode: true, id: true },
      }).then(async (ev) => {
        if (!ev) return;
        const frontendUrl = (process.env.FRONTEND_URL || 'https://dash.xn--gstefotos-v2a.com').replace(/\/$/, '');
        const briefingUrl = `${frontendUrl}/events/${ev.id}/briefing`;
        const dashboardUrl = `${frontendUrl}/events/${ev.id}/dashboard`;
        const packageName = pkg?.name || pkg?.resultingTier || 'Standard';
        await (emailService as any).transporter?.sendMail({
          from: (emailService as any).config?.from || 'info@gaestefotos.com',
          to: customerEmail,
          subject: `🎉 Dein gästefotos.com Event ist bereit! Jetzt Briefing ausfüllen`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#295B4D">Vielen Dank für deine Buchung! 🎉</h2>
              <p>Dein <strong>${packageName}</strong>-Paket wurde aktiviert.</p>
              <p>Fülle jetzt das <strong>Event-Briefing</strong> aus, damit wir deine KI-Features optimal konfigurieren können:</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${briefingUrl}" style="background:#295B4D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                  ✏️ Briefing ausfüllen
                </a>
              </p>
              <p>Oder gehe direkt zu deinem <a href="${dashboardUrl}">Event-Dashboard</a>.</p>
              ${ev.eventCode ? `<p style="background:#f5f5f5;padding:12px;border-radius:8px">Dein Event-Code: <strong>${ev.eventCode}</strong></p>` : ''}
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
              <p style="color:#666;font-size:13px">Bei Fragen: <a href="mailto:support@gaestefotos.com">support@gaestefotos.com</a></p>
            </div>`,
          text: `Vielen Dank für deine Buchung!\n\nBriefing ausfüllen: ${briefingUrl}\nDashboard: ${dashboardUrl}${ev.eventCode ? `\nEvent-Code: ${ev.eventCode}` : ''}`,
        });
        logger.info('WooCommerce: Briefing-Email gesendet', { to: customerEmail, eventId: ev.id });
      }).catch((err: any) => logger.warn('WooCommerce: Briefing-Email fehlgeschlagen', { error: err.message }));
    }

    return { httpStatus: 200, body: { success: true, eventId: processed.eventId, mode: processed.mode } };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'FAILED', reason: 'invalid_payload', error: JSON.stringify(error.errors).slice(0, 2000) },
          })
          .catch(() => null);
      }
      return { httpStatus: 400, body: { error: error.errors } };
    }
    if (error?.code === 'EVENT_NOT_FOUND') {
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'FAILED', reason: 'event_not_found', error: 'EVENT_NOT_FOUND' },
          })
          .catch(() => null);
      }
      return { httpStatus: 404, body: { error: 'Event not found' } };
    }
    if (error?.code === 'EVENT_CODE_NOT_OWNED') {
      logger.info('woocommerce_webhook_ignored', { reason: 'eventCode_not_owned_by_customer' });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason: 'eventCode_not_owned_by_customer' },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason: 'eventCode_not_owned_by_customer' } };
    }
    if (error?.code === 'NO_LOCAL_USER_MAPPING') {
      logger.info('woocommerce_webhook_ignored', { reason: 'no_local_user_mapping' });
      if (logId) {
        await (prisma as any).wooWebhookEventLog
          .update({
            where: { id: logId },
            data: { status: 'IGNORED', reason: 'no_local_user_mapping' },
          })
          .catch(() => null);
      }
      return { httpStatus: 200, body: { success: true, ignored: true, reason: 'no_local_user_mapping' } };
    }

    logger.error('WooCommerce webhook error', {
      message: getErrorMessage(error),
    });

    if (logId) {
      await (prisma as any).wooWebhookEventLog
        .update({
          where: { id: logId },
          data: { status: 'FAILED', reason: 'unhandled', error: (getErrorMessage(error)).slice(0, 2000) },
        })
        .catch(() => null);
    }
    return { httpStatus: 500, body: { error: 'Internal server error' } };
  }
}

router.post('/order-paid', async (req: RawBodyRequest, res: Response) => {
  const signatureOk = verifyWooSignature(req);
  const payloadHash = hashPayload(req.rawBody);

  const logBase: any = {
    provider: 'WOOCOMMERCE',
    topic: 'order-paid',
    signatureOk,
    payloadHash,
    payload: req.body as any,
  };

  const createdLog = await (prisma as any).wooWebhookEventLog
    .create({
      data: {
        ...logBase,
        status: signatureOk ? 'RECEIVED' : 'FORBIDDEN',
      },
    })
    .catch(() => null);

  const logId = createdLog?.id;


  const result = await processWooOrderPaidWebhook({
    payload: req.body,
    signatureOk,
    payloadHash,
    logId,
  });

  return res.status(result.httpStatus).json(result.body);
});

export default router;
