import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

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
              <h1>${options.eventTitle}</h1>
            </div>
            <div class="content">
              <p>Hallo ${options.guestName},</p>
              <p>Du bist herzlich eingeladen zu unserem Event: <strong>${options.eventTitle}</strong></p>
              <p>Klicke auf den Button unten, um zur Event-Seite zu gelangen und deine Teilnahme zu bestätigen:</p>
              <p style="text-align: center;">
                <a href="${eventUrl}" class="button">Zur Event-Seite</a>
              </p>
              <p>Oder kopiere diesen Link in deinen Browser:</p>
              <p style="word-break: break-all; color: #295B4D;">${eventUrl}</p>
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
              <h1>${options.eventTitle}</h1>
            </div>
            <div class="content">
              <p>Hallo ${options.hostName},</p>
              <p><strong>${subjectPrefix}</strong> endet die Speicherperiode für dein Event <strong>${options.eventTitle}</strong>.</p>
              <p>Speicherende: <strong>${endsAtText}</strong></p>
              <p>Du kannst deine Fotos und Videos im Dashboard herunterladen, solange die Speicherperiode aktiv ist.</p>
              <p style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Zum Dashboard</a>
              </p>
              <p>Oder kopiere diesen Link in deinen Browser:</p>
              <p style="word-break: break-all; color: #295B4D;">${dashboardUrl}</p>
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















