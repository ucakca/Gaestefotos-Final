import { z } from 'zod';

// Event validation schemas
export const eventSlugSchema = z.string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten');

export const emailSchema = z.string().email('Ungültige E-Mail-Adresse');

export const eventCreateSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  slug: eventSlugSchema,
  dateTime: z.date(),
  locationName: z.string().optional(),
  locationGoogleMapsLink: z.string().url().optional(),
});

// Guest validation schemas
export const guestCreateSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  email: emailSchema.optional(),
  dietaryRequirements: z.string().optional(),
  plusOneCount: z.number().int().min(0).default(0),
});

// Photo validation schemas
export const photoUploadSchema = z.object({
  eventId: z.string().uuid(),
  file: z.instanceof(File),
});

