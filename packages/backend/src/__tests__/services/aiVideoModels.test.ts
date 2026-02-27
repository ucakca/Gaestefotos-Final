
import { describe, it, expect } from 'vitest';
import { getAvailableVideoModels } from '../../services/aiVideoGen';

describe('aiVideoGen - FAL.ai Video Models', () => {
  it('returns all 5 video models', () => {
    const models = getAvailableVideoModels();
    expect(models).toHaveLength(5);
  });

  it('each model has required fields', () => {
    const models = getAvailableVideoModels();
    for (const m of models) {
      expect(m).toHaveProperty('key');
      expect(m).toHaveProperty('model');
      expect(m).toHaveProperty('label');
      expect(m).toHaveProperty('tier');
      expect(typeof m.key).toBe('string');
      expect(m.model).toContain('fal-ai/');
      expect(['fast', 'standard', 'premium']).toContain(m.tier);
    }
  });

  it('contains seedance, kling, wan, vidu, hailuo', () => {
    const models = getAvailableVideoModels();
    const keys = models.map(m => m.key);
    expect(keys).toContain('seedance');
    expect(keys).toContain('kling');
    expect(keys).toContain('wan');
    expect(keys).toContain('vidu');
    expect(keys).toContain('hailuo');
  });

  it('has at least one fast-tier model', () => {
    const models = getAvailableVideoModels();
    const fast = models.filter(m => m.tier === 'fast');
    expect(fast.length).toBeGreaterThanOrEqual(1);
  });

  it('has at least one premium-tier model', () => {
    const models = getAvailableVideoModels();
    const premium = models.filter(m => m.tier === 'premium');
    expect(premium.length).toBeGreaterThanOrEqual(1);
  });

  it('all model paths include image-to-video', () => {
    const models = getAvailableVideoModels();
    for (const m of models) {
      expect(m.model).toContain('image-to-video');
    }
  });
});
