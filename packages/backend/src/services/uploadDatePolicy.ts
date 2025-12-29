import { logger } from '../utils/logger';

export type CapturedAtSource = 'EXIF_DATE_TIME_ORIGINAL' | 'EXIF_CREATE_DATE' | 'UPLOAD_TIME';

export type CapturedAtResult = {
  capturedAt: Date;
  source: CapturedAtSource;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export async function extractCapturedAtFromImage(
  buffer: Buffer,
  uploadTime: Date
): Promise<CapturedAtResult> {
  try {
    const exifr: any = await import('exifr');
    const exif = await exifr.parse(buffer, {
      pick: ['DateTimeOriginal', 'CreateDate'],
    });

    const dto = toDate(exif?.DateTimeOriginal);
    if (dto) {
      return { capturedAt: dto, source: 'EXIF_DATE_TIME_ORIGINAL' };
    }

    const cd = toDate(exif?.CreateDate);
    if (cd) {
      return { capturedAt: cd, source: 'EXIF_CREATE_DATE' };
    }
  } catch (error) {
    logger.warn('[Upload Date Policy] EXIF parse failed, falling back to upload time', {
      message: (error as any)?.message || String(error),
    });
  }

  return { capturedAt: uploadTime, source: 'UPLOAD_TIME' };
}

export function isWithinDateWindowPlusMinusDays(params: {
  capturedAt: Date;
  referenceDateTime: Date;
  toleranceDays: number;
}): boolean {
  const { capturedAt, referenceDateTime, toleranceDays } = params;

  const start = startOfDay(referenceDateTime);
  start.setDate(start.getDate() - toleranceDays);

  const end = endOfDay(referenceDateTime);
  end.setDate(end.getDate() + toleranceDays);

  return capturedAt >= start && capturedAt <= end;
}
