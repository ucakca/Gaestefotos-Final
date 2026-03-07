import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger before importing
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { runpodService } from '../../services/runpodService';

describe('runpodService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return false when env vars are missing', () => {
      delete process.env.RUNPOD_API_KEY;
      delete process.env.RUNPOD_ENDPOINT_ID;
      expect(runpodService.isConfigured()).toBe(false);
    });

    it('should return true when both env vars are set', () => {
      process.env.RUNPOD_API_KEY = 'test-key';
      process.env.RUNPOD_ENDPOINT_ID = 'test-endpoint';
      expect(runpodService.isConfigured()).toBe(true);
    });
  });

  describe('extractOutputBuffer', () => {
    it('should extract base64 image from worker-comfyui v5.x format', async () => {
      const b64 = Buffer.from('test-image-data').toString('base64');
      const output = {
        images: [{ type: 'base64', data: b64, filename: 'output.png' }],
      };

      const { buffer, externalUrl } = await runpodService.extractOutputBuffer(output);
      expect(buffer).toEqual(Buffer.from('test-image-data'));
      expect(externalUrl).toBeNull();
    });

    it('should extract from legacy format (img.image)', async () => {
      const b64 = Buffer.from('legacy-data').toString('base64');
      const output = {
        images: [{ image: b64 }],
      };

      const { buffer } = await runpodService.extractOutputBuffer(output);
      expect(buffer).toEqual(Buffer.from('legacy-data'));
    });

    it('should extract from message format (pre v5.0)', async () => {
      const b64 = Buffer.from('message-data').toString('base64');
      const output = { message: b64 };

      const { buffer } = await runpodService.extractOutputBuffer(output);
      expect(buffer).toEqual(Buffer.from('message-data'));
    });

    it('should return externalUrl for image_url format', async () => {
      const output = { image_url: 'https://example.com/result.png' };

      const { buffer, externalUrl } = await runpodService.extractOutputBuffer(output);
      expect(buffer).toBeNull();
      expect(externalUrl).toBe('https://example.com/result.png');
    });

    it('should download from s3_url format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode('s3-data').buffer),
      });

      const output = {
        images: [{ type: 's3_url', data: 'https://s3.example.com/img.png' }],
      };

      const { buffer } = await runpodService.extractOutputBuffer(output);
      expect(buffer).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledWith('https://s3.example.com/img.png');
    });

    it('should download from img.url format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode('url-data').buffer),
      });

      const output = {
        images: [{ url: 'https://cdn.example.com/img.png' }],
      };

      const { buffer } = await runpodService.extractOutputBuffer(output);
      expect(buffer).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledWith('https://cdn.example.com/img.png');
    });

    it('should return nulls for empty output', async () => {
      const { buffer, externalUrl } = await runpodService.extractOutputBuffer({});
      expect(buffer).toBeNull();
      expect(externalUrl).toBeNull();
    });

    it('should return nulls for empty images array', async () => {
      const { buffer, externalUrl } = await runpodService.extractOutputBuffer({ images: [] });
      expect(buffer).toBeNull();
      expect(externalUrl).toBeNull();
    });
  });

  describe('submitJob', () => {
    it('should return null when not configured', async () => {
      delete process.env.RUNPOD_API_KEY;
      delete process.env.RUNPOD_ENDPOINT_ID;

      const result = await runpodService.submitJob({ workflow: {} });
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should submit job and return jobId', async () => {
      process.env.RUNPOD_API_KEY = 'test-key';
      process.env.RUNPOD_ENDPOINT_ID = 'test-ep';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'job-123', status: 'IN_QUEUE' }),
      });

      const result = await runpodService.submitJob({ workflow: { '1': {} } });
      expect(result).toEqual({ jobId: 'job-123' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.runpod.ai/v2/test-ep/run',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        }),
      );
    });

    it('should return null on HTTP error', async () => {
      process.env.RUNPOD_API_KEY = 'test-key';
      process.env.RUNPOD_ENDPOINT_ID = 'test-ep';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const result = await runpodService.submitJob({ workflow: {} });
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      process.env.RUNPOD_API_KEY = 'test-key';
      process.env.RUNPOD_ENDPOINT_ID = 'test-ep';

      mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

      const result = await runpodService.submitJob({ workflow: {} });
      expect(result).toBeNull();
    });
  });
});
