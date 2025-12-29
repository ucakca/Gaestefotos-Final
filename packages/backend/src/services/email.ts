import nodemailer from 'nodemailer';
import prisma from '../config/database';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

class EmailService {
  private transporter: any = null;
  private config: EmailConfig | null = null;

  private escapeHtml(value: any): string {
    const s = value === null || value === undefined ? '' : String(value);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  renderTemplate(input: {
    subject: string;
    html?: string | null;
    text?: string | null;
    variables: Record<string, any>;
  }): { subject: string; html?: string; text?: string } {
    const replace = (tpl: string, mode: 'html' | 'text' | 'subject'): string => {
      return tpl.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key) => {
        const parts = String(key).split('.');
        let cur: any = input.variables;
        for (const p of parts) {
          if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
          else return '';
        }

        if (mode === 'html') {
          return this.escapeHtml(cur);
        }
        return cur === null || cur === undefined ? '' : String(cur);
      });
    };

    const subject = replace(input.subject, 'subject');
    const html = input.html ? replace(input.html, 'html') : undefined;
    const text = input.text ? replace(input.text, 'text') : undefined;
    return { subject, html, text };
  }

  async sendTemplatedEmail(options: {
    to: string;
    template: { subject: string; html?: string | null; text?: string | null };
    variables: Record<string, any>;
  }) {
    if (!this.transporter || !this.config) {
      throw new Error('Email-Service nicht konfiguriert');
    }

    const rendered = this.renderTemplate({
      subject: options.template.subject,
      html: options.template.html,
      text: options.template.text,
      variables: options.variables,
    });

    await this.transporter.sendMail({
      from: this.config.from,
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  private async getActiveTemplate(kind: 'INVITATION' | 'STORAGE_ENDS_REMINDER' | 'PHOTO_NOTIFICATION') {
    try {
      const tpl = await (prisma as any).emailTemplate.findFirst({
        where: { kind, isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
      return tpl || null;
    } catch {
      return null;
    }
  }

  async configure(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  async sendInvitation(options: {
    to: string;
    eventTitle: string;
    eventSlug: string;
    guestName: string;
    inviteToken?: string;
  }) {
    if (!this.transporter || !this.config) {
      throw new Error('Email-Service nicht konfiguriert');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteFragment = options.inviteToken ? `#invite=${encodeURIComponent(options.inviteToken)}` : '';
    const eventUrl = `${baseUrl}/e2/${options.eventSlug}/invitation${inviteFragment}`;

    const tpl = await this.getActiveTemplate('INVITATION');
    if (tpl) {
      await this.sendTemplatedEmail({
        to: options.to,
        template: { subject: tpl.subject, html: tpl.html, text: tpl.text },
        variables: {
          eventTitle: options.eventTitle,
          eventSlug: options.eventSlug,
          guestName: options.guestName,
          eventUrl,
        },
      });
      return;
    }

    const safeEventTitle = this.escapeHtml(options.eventTitle);
    const safeGuestName = this.escapeHtml(options.guestName);
    const safeEventUrl = this.escapeHtml(eventUrl);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #295B4D; color: white; padding: 20px; text-align: center; }
            .content { background-color: #F9F5F2; padding: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #EAA48F; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${safeEventTitle}</h1>
            </div>
            <div class="content">
              <p>Hallo ${safeGuestName},</p>
              <p>Du bist herzlich eingeladen zu unserem Event: <strong>${safeEventTitle}</strong></p>
              <p>Klicke auf den Button unten, um zur Event-Seite zu gelangen und deine Teilnahme zu bestätigen:</p>
              <p style="text-align: center;">
                <a href="${safeEventUrl}" class="button">Zur Event-Seite</a>
              </p>
              <p>Oder kopiere diesen Link in deinen Browser:</p>
              <p style="word-break: break-all; color: #295B4D;">${safeEventUrl}</p>
            </div>
            <div class="footer">
              <p>Diese Einladung wurde von Gästefotos versendet.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hallo ${options.guestName},

Du bist herzlich eingeladen zu unserem Event: ${options.eventTitle}

Event-Seite: ${eventUrl}

Bitte bestätige deine Teilnahme auf der Event-Seite.

Viele Grüße
    `;

    await this.transporter.sendMail({
      from: this.config.from,
      to: options.to,
      subject: `Einladung: ${options.eventTitle}`,
      html,
      text,
    });
  }

  async sendPhotoNotification(options: {
    to: string;
    eventTitle: string;
    photoCount: number;
    status: 'approved' | 'rejected';
  }) {
    if (!this.transporter || !this.config) {
      throw new Error('Email-Service nicht konfiguriert');
    }

    const message = options.status === 'approved'
      ? `Dein${options.photoCount > 1 ? 'e' : ''} Foto${options.photoCount > 1 ? 's' : ''} wurde${options.photoCount === 1 ? '' : 'n'} freigegeben!`
      : `Dein${options.photoCount > 1 ? 'e' : ''} Foto${options.photoCount > 1 ? 's' : ''} wurde${options.photoCount === 1 ? '' : 'n'} abgelehnt.`;

    const tpl = await this.getActiveTemplate('PHOTO_NOTIFICATION');
    if (tpl) {
      await this.sendTemplatedEmail({
        to: options.to,
        template: { subject: tpl.subject, html: tpl.html, text: tpl.text },
        variables: {
          eventTitle: options.eventTitle,
          photoCount: options.photoCount,
          status: options.status,
          message,
        },
      });
      return;
    }

    await this.transporter.sendMail({
      from: this.config.from,
      to: options.to,
      subject: `Foto-Status: ${options.eventTitle}`,
      html: `<p>${message}</p>`,
      text: message,
    });
  }

  async sendStorageEndsReminder(options: {
    to: string;
    hostName: string;
    eventTitle: string;
    eventId: string;
    storageEndsAt: Date;
    daysBefore: number;
  }) {
    if (!this.transporter || !this.config) {
      throw new Error('Email-Service nicht konfiguriert');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const dashboardUrl = `${baseUrl}/events/${options.eventId}/dashboard`;
    const endsAtText = options.storageEndsAt.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const subjectPrefix = options.daysBefore === 1 ? 'Morgen' : `In ${options.daysBefore} Tagen`;

    const tpl = await this.getActiveTemplate('STORAGE_ENDS_REMINDER');
    if (tpl) {
      await this.sendTemplatedEmail({
        to: options.to,
        template: { subject: tpl.subject, html: tpl.html, text: tpl.text },
        variables: {
          hostName: options.hostName,
          eventTitle: options.eventTitle,
          eventId: options.eventId,
          storageEndsAt: endsAtText,
          daysBefore: options.daysBefore,
          subjectPrefix,
          dashboardUrl,
        },
      });
      return;
    }

    const safeEventTitle = this.escapeHtml(options.eventTitle);
    const safeHostName = this.escapeHtml(options.hostName);
    const safeSubjectPrefix = this.escapeHtml(subjectPrefix);
    const safeEndsAtText = this.escapeHtml(endsAtText);
    const safeDashboardUrl = this.escapeHtml(dashboardUrl);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #295B4D; color: white; padding: 20px; text-align: center; }
            .content { background-color: #F9F5F2; padding: 30px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #EAA48F; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${safeEventTitle}</h1>
            </div>
            <div class="content">
              <p>Hallo ${safeHostName},</p>
              <p><strong>${safeSubjectPrefix}</strong> endet die Speicherperiode für dein Event <strong>${safeEventTitle}</strong>.</p>
              <p>Speicherende: <strong>${safeEndsAtText}</strong></p>
              <p>Du kannst deine Fotos und Videos im Dashboard herunterladen, solange die Speicherperiode aktiv ist.</p>
              <p style="text-align: center;">
                <a href="${safeDashboardUrl}" class="button">Zum Dashboard</a>
              </p>
              <p>Oder kopiere diesen Link in deinen Browser:</p>
              <p style="word-break: break-all; color: #295B4D;">${safeDashboardUrl}</p>
            </div>
            <div class="footer">
              <p>Diese Erinnerung wurde von Gästefotos versendet.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hallo ${options.hostName},

${subjectPrefix} endet die Speicherperiode für dein Event "${options.eventTitle}".

Speicherende: ${endsAtText}

Dashboard: ${dashboardUrl}
    `;

    await this.transporter.sendMail({
      from: this.config.from,
      to: options.to,
      subject: `${subjectPrefix}: Speicherperiode endet für ${options.eventTitle}`,
      html,
      text,
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

export const emailService = new EmailService();

// Initialize from environment variables if available
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  emailService.configure({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  });
}















