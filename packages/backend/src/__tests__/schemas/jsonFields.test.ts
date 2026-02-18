import { describe, it, expect } from 'vitest';
import {
  DesignConfigSchema,
  FeaturesConfigSchema,
  MemberPermissionsSchema,
  InvitationDesignSchema,
  ExifDataSchema,
  FaceDataSchema,
  parseDesignConfig,
  parseFeaturesConfig,
  parseMemberPermissions,
  parseInvitationDesign,
  parseExifData,
  parseFaceData,
} from '../../schemas/jsonFields';

describe('jsonFields Zod Schemas', () => {
  describe('DesignConfigSchema', () => {
    it('should accept valid design config', () => {
      const result = DesignConfigSchema.safeParse({
        colorScheme: 'dark',
        primaryColor: '#ff0000',
        fontFamily: 'Inter',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      expect(DesignConfigSchema.safeParse({}).success).toBe(true);
    });

    it('should reject invalid colorScheme', () => {
      const result = DesignConfigSchema.safeParse({ colorScheme: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should pass through unknown fields', () => {
      const result = DesignConfigSchema.safeParse({ customField: 'value' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).customField).toBe('value');
      }
    });
  });

  describe('FeaturesConfigSchema', () => {
    it('should accept valid features config', () => {
      const result = FeaturesConfigSchema.safeParse({
        mysteryMode: true,
        allowUploads: false,
        faceSearch: true,
      });
      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = FeaturesConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mysteryMode).toBe(false);
        expect(result.data.allowUploads).toBe(true);
        expect(result.data.faceSearch).toBe(true);
      }
    });

    it('should accept nested uploadRateLimits', () => {
      const result = FeaturesConfigSchema.safeParse({
        uploadRateLimits: { photoIpMax: 100, photoEventMax: 500 },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('MemberPermissionsSchema', () => {
    it('should accept valid permissions', () => {
      const result = MemberPermissionsSchema.safeParse({
        canUpload: true,
        canModerate: false,
        canEditEvent: false,
        canDownload: true,
      });
      expect(result.success).toBe(true);
    });

    it('should apply correct defaults', () => {
      const result = MemberPermissionsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canUpload).toBe(true);
        expect(result.data.canModerate).toBe(false);
        expect(result.data.canEditEvent).toBe(false);
        expect(result.data.canDownload).toBe(true);
      }
    });

    it('should reject non-boolean values', () => {
      const result = MemberPermissionsSchema.safeParse({ canUpload: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  describe('ExifDataSchema', () => {
    it('should accept EXIF data', () => {
      const result = ExifDataSchema.safeParse({
        make: 'Canon',
        model: 'EOS R5',
        iso: 400,
        fNumber: 2.8,
        width: 8192,
        height: 5464,
      });
      expect(result.success).toBe(true);
    });

    it('should accept GPS coordinates', () => {
      const result = ExifDataSchema.safeParse({
        gpsLatitude: 48.2082,
        gpsLongitude: 16.3738,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('FaceDataSchema', () => {
    it('should accept face detection results', () => {
      const result = FaceDataSchema.safeParse({
        faces: [{
          boundingBox: { x: 100, y: 50, width: 200, height: 200 },
          confidence: 0.98,
        }],
        processedAt: '2026-02-18T10:00:00Z',
        version: '1.0',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty faces array', () => {
      const result = FaceDataSchema.safeParse({ faces: [] });
      expect(result.success).toBe(true);
    });
  });

  describe('Parse helpers', () => {
    it('parseDesignConfig should return {} on null', () => {
      expect(parseDesignConfig(null)).toEqual({});
    });

    it('parseFeaturesConfig should return defaults on invalid', () => {
      const result = parseFeaturesConfig(null);
      expect(result).toBeDefined();
      expect(result.mysteryMode).toBe(false);
    });

    it('parseMemberPermissions should return defaults on null', () => {
      const result = parseMemberPermissions(null);
      expect(result.canUpload).toBe(true);
      expect(result.canModerate).toBe(false);
      expect(result.canEditEvent).toBe(false);
      expect(result.canDownload).toBe(true);
    });

    it('parseInvitationDesign should return {} on null', () => {
      expect(parseInvitationDesign(null)).toEqual({});
    });

    it('parseExifData should return {} on null', () => {
      expect(parseExifData(null)).toEqual({});
    });

    it('parseFaceData should return {} on null', () => {
      expect(parseFaceData(null)).toEqual({});
    });

    it('parseFeaturesConfig should handle invalid types gracefully', () => {
      const result = parseFeaturesConfig('not an object');
      expect(result).toBeDefined();
    });

    it('parseDesignConfig should preserve valid data', () => {
      const input = { colorScheme: 'dark', primaryColor: '#000' };
      const result = parseDesignConfig(input);
      expect(result.colorScheme).toBe('dark');
      expect(result.primaryColor).toBe('#000');
    });
  });
});
