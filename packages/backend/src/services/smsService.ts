/**
 * SMS Service
 * 
 * Sends SMS messages via Twilio for photo sharing.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getConfig(): SmsConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

/**
 * Send an SMS via Twilio REST API (no SDK dependency needed)
 */
async function sendTwilioSms(config: SmsConfig, to: string, body: string): Promise<{ sid: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', config.fromNumber);
  params.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errData: any = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Twilio API error ${response.status}: ${errData.message || JSON.stringify(errData)}`);
  }

  const data: any = await response.json();
  return { sid: data.sid };
}

/**
 * Check if SMS service is configured
 */
export function isSmsConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Send a photo share link via SMS
 */
export async function sendPhotoShareSms(options: {
  phoneNumber: string;
  senderName: string;
  eventTitle: string;
  photoUrl: string;
  photoId: string;
  eventId: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();
  if (!config) {
    return { success: false, error: 'SMS-Service nicht konfiguriert (Twilio Credentials fehlen)' };
  }

  // Build SMS text
  const lines = [
    `${options.senderName} hat dir ein Foto geteilt!`,
    `Event: ${options.eventTitle}`,
  ];
  if (options.message) {
    lines.push(`"${options.message}"`);
  }
  lines.push(`Foto ansehen: ${options.photoUrl}`);
  lines.push('- gaestefotos.com');

  const body = lines.join('\n');

  try {
    const result = await sendTwilioSms(config, options.phoneNumber, body);

    // Log the share
    try {
      await prisma.smsMessage.create({
        data: {
          photoId: options.photoId,
          eventId: options.eventId,
          recipientPhone: options.phoneNumber,
          message: options.message || body,
          externalId: result.sid,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (logErr) {
      logger.warn('Failed to log SMS share', { err: logErr });
    }

    logger.info('SMS photo share sent', { to: options.phoneNumber, twilioSid: result.sid });
    return { success: true };
  } catch (err: any) {
    logger.error('SMS send failed', { err: err.message, to: options.phoneNumber });

    // Log failed attempt
    try {
      await prisma.smsMessage.create({
        data: {
          photoId: options.photoId,
          eventId: options.eventId,
          recipientPhone: options.phoneNumber,
          message: options.message || body,
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    } catch (logErr) {
      logger.warn('Failed to log SMS share error', { err: logErr });
    }

    return { success: false, error: err.message };
  }
}

/**
 * Send a bulk SMS to multiple recipients
 */
export async function sendBulkPhotoShareSms(
  recipients: Array<{ phoneNumber: string; senderName: string }>,
  eventTitle: string,
  photoUrl: string,
  photoId: string,
  eventId: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendPhotoShareSms({
      phoneNumber: recipient.phoneNumber,
      senderName: recipient.senderName,
      eventTitle,
      photoUrl,
      photoId,
      eventId,
    });

    if (result.success) sent++;
    else failed++;

    // Rate limit: wait 100ms between messages
    if (recipients.length > 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return { sent, failed };
}
