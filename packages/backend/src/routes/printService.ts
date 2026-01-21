import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// GET Settings
router.get('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // TODO: printServiceSettings table doesn't exist - return mock
    const settings = { enabled: false, wordpressUrl: null };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching print service settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST Update Settings
router.post('/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { enabled, productIdA6, productIdA5, priceA6, priceA5, wordpressUrl } = req.body;

    // TODO: printServiceSettings table doesn't exist
    const settings = { enabled, productIdA6, productIdA5, priceA6, priceA5, wordpressUrl };

    res.json(settings);
  } catch (error) {
    console.error('Error updating print service settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST Generate Checkout URL
router.post('/checkout-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, designId, format, quantity = 1 } = req.body;

    if (!eventId || !designId || !format) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // TODO: printServiceSettings table doesn't exist
    return res.status(400).json({ error: 'Print service not enabled' });
});

export default router;
  } catch (error) {
    console.error('Error generating checkout URL:', error);
    res.status(500).json({ error: 'Failed to generate checkout URL' });
  }
});

export default router;
