import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog, AuditType } from '../services/auditLogger';
import { encryptValue, decryptValue } from '../utils/encryption';
import { emailService } from '../services/email';
import { logger } from '../utils/logger';

const router = Router();

const GENERAL_KEY = 'general_settings';

const generalSchema = z.object({
  siteName: z.string().optional().default('Gästefotos'),
  supportEmail: z.string().email().optional().default('support@gaestefotos.com'),
  consentText: z.string().optional().default(''),
  footerText: z.string().optional().default(''),
});

router.get('/general', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const row = await prisma.appSetting.findUnique({ where: { key: GENERAL_KEY } });
  const defaults = {
    siteName: 'Gästefotos',
    supportEmail: 'support@gaestefotos.com',
    consentText: '',
    footerText: '',
  };
  const settings = row ? { ...defaults, ...(row.value as any) } : defaults;
  res.json({ settings });
});

router.post('/general', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = generalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültige Einstellungen', details: parsed.error.errors });
  }

  const settings = await prisma.appSetting.upsert({
    where: { key: GENERAL_KEY },
    create: { key: GENERAL_KEY, value: parsed.data as any },
    update: { value: parsed.data as any },
  });

  auditLog({ type: AuditType.ADMIN_SETTINGS_CHANGED, message: 'Allgemeine Einstellungen geändert', data: parsed.data, req });

  res.json({ settings: settings.value });
});

// ─── SMTP E-Mail Einstellungen ────────────────────────────────────────────────

const SMTP_KEY = 'smtp_config';

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  user: z.string().min(1),
  password: z.string().optional(),
  from: z.string().optional(),
  servername: z.string().optional(),
});

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function buildTlsOptions(host: string, servername?: string) {
  if (isLocalHost(host)) {
    return { rejectUnauthorized: false, ...(servername ? { servername } : {}) };
  }
  return undefined;
}

router.get('/email', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: SMTP_KEY } });
    if (!row) return res.json({ configured: false, config: null });
    const cfg = row.value as any;
    res.json({
      configured: true,
      connected: await emailService.testConnection(),
      config: {
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        user: cfg.user,
        password: '••••••••',
        from: cfg.from || cfg.user,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/email', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = smtpSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.errors });

    const { host, port, secure, user, from } = parsed.data;
    let passwordEnc: string | null = null;

    const existing = await prisma.appSetting.findUnique({ where: { key: SMTP_KEY } });

    if (parsed.data.password && parsed.data.password !== '••••••••') {
      const enc = encryptValue(parsed.data.password);
      passwordEnc = JSON.stringify(enc);
    } else if (existing) {
      passwordEnc = (existing.value as any).passwordEnc || null;
    }

    if (!passwordEnc) return res.status(400).json({ error: 'Passwort ist erforderlich' });

    const { servername } = parsed.data;
    const tlsOptions = buildTlsOptions(host, servername);
    const configToStore = { host, port, secure, user, from: from || user, passwordEnc, servername: servername || null };
    await prisma.appSetting.upsert({
      where: { key: SMTP_KEY },
      create: { key: SMTP_KEY, value: configToStore as any },
      update: { value: configToStore as any },
    });

    const plainPw = decryptValue(JSON.parse(passwordEnc));
    await emailService.configure({ host, port, secure, user, password: plainPw, from: from || user, tlsOptions });

    auditLog({ type: AuditType.ADMIN_SETTINGS_CHANGED, message: 'SMTP Einstellungen geändert', data: { host, port, secure, user }, req });
    res.json({ success: true, connected: await emailService.testConnection() });
  } catch (err: any) {
    logger.error('SMTP settings save error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/email/test', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Ziel-E-Mail fehlt' });

    const connected = await emailService.testConnection();
    if (!connected) return res.status(503).json({ error: 'E-Mail-Service nicht verbunden. Bitte erst SMTP-Einstellungen speichern.' });

    await (emailService as any).transporter.sendMail({
      from: (emailService as any).config.from,
      to,
      subject: '✅ Gästefotos SMTP Test',
      text: 'SMTP-Verbindung erfolgreich! Deine E-Mail-Einstellungen funktionieren.',
      html: '<p>✅ <strong>SMTP-Verbindung erfolgreich!</strong><br>Deine Gästefotos E-Mail-Einstellungen funktionieren.</p>',
    });

    res.json({ success: true, message: `Test-E-Mail an ${to} gesendet` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
