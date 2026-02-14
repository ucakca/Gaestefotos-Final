import { Router, Request, Response } from 'express';
import groqService from '../lib/groq';
import { getActiveProviderInfo } from '../lib/llmClient';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting: simple in-memory counter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  
  if (!entry || entry.resetAt < now) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Middleware for rate limiting
const rateLimitMiddleware = (req: Request, res: Response, next: Function) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' });
  }
  
  next();
};

/**
 * POST /api/ai/suggest-albums
 * Generate album name suggestions based on event type
 */
router.post('/suggest-albums', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType, eventTitle } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType ist erforderlich' });
    }
    
    const albums = await groqService.suggestAlbums(eventType, eventTitle);
    res.json({ albums });
  } catch (error) {
    logger.error('Error in suggest-albums:', { error: (error as Error).message });
    res.status(500).json({ error: 'KI-Vorschlag konnte nicht generiert werden' });
  }
});

/**
 * POST /api/ai/suggest-description
 * Generate event description
 */
router.post('/suggest-description', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType, eventTitle, eventDate } = req.body;
    
    if (!eventType || !eventTitle) {
      return res.status(400).json({ error: 'eventType und eventTitle sind erforderlich' });
    }
    
    const description = await groqService.suggestDescription(eventType, eventTitle, eventDate);
    res.json({ description });
  } catch (error) {
    logger.error('Error in suggest-description:', { error: (error as Error).message });
    res.status(500).json({ error: 'KI-Vorschlag konnte nicht generiert werden' });
  }
});

/**
 * POST /api/ai/suggest-invitation
 * Generate invitation text
 */
router.post('/suggest-invitation', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType, eventTitle, hostName } = req.body;
    
    if (!eventType || !eventTitle) {
      return res.status(400).json({ error: 'eventType und eventTitle sind erforderlich' });
    }
    
    const text = await groqService.suggestInvitationText(eventType, eventTitle, hostName);
    res.json({ text });
  } catch (error) {
    logger.error('Error in suggest-invitation:', { error: (error as Error).message });
    res.status(500).json({ error: 'KI-Vorschlag konnte nicht generiert werden' });
  }
});

/**
 * POST /api/ai/suggest-challenges
 * Generate challenge ideas
 */
router.post('/suggest-challenges', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType ist erforderlich' });
    }
    
    const challenges = await groqService.suggestChallenges(eventType);
    res.json({ challenges });
  } catch (error) {
    logger.error('Error in suggest-challenges:', { error: (error as Error).message });
    res.status(500).json({ error: 'KI-Vorschlag konnte nicht generiert werden' });
  }
});

/**
 * POST /api/ai/suggest-guestbook
 * Generate guestbook welcome message
 */
router.post('/suggest-guestbook', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType, eventTitle } = req.body;
    
    if (!eventType || !eventTitle) {
      return res.status(400).json({ error: 'eventType und eventTitle sind erforderlich' });
    }
    
    const message = await groqService.suggestGuestbookMessage(eventType, eventTitle);
    res.json({ message });
  } catch (error) {
    logger.error('Error in suggest-guestbook:', { error: (error as Error).message });
    res.status(500).json({ error: 'KI-Vorschlag konnte nicht generiert werden' });
  }
});

/**
 * GET /api/ai/status
 * Check if AI is available
 */
router.get('/status', (req: Request, res: Response) => {
  const info = getActiveProviderInfo();
  res.json(info);
});

// ===== CHAT BOT WITH CACHING =====

// FAQ Cache - loaded from knowledge base
const faqCache = new Map<string, string>();
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Simple keyword matching for FAQ
const FAQ_KEYWORDS: Record<string, { keywords: string[]; response: string }> = {
  'foto-loeschen': {
    keywords: ['foto löschen', 'bild löschen', 'foto entfernen', 'löschen foto'],
    response: 'Um ein Foto zu löschen:\n1. Öffne die Galerie\n2. Tippe auf das Foto\n3. Klicke auf das Papierkorb-Symbol\n4. Bestätige die Löschung\n\n⚠️ Gelöschte Fotos können nicht wiederhergestellt werden.'
  },
  'gaeste-einladen': {
    keywords: ['gäste einladen', 'einladung', 'einladen', 'gast hinzufügen'],
    response: 'Du kannst Gäste auf verschiedene Arten einladen:\n\n📱 **QR-Code:** Im Dashboard unter "QR-Code" findest du einen scannbaren Code.\n\n🔗 **Link:** Kopiere den Event-Link und teile ihn per WhatsApp, E-Mail oder SMS.\n\n🎟️ **Tipp:** Drucke den QR-Code auf Tischkarten oder füge ihn zur Einladung hinzu!'
  },
  'qr-code': {
    keywords: ['qr code', 'qr-code', 'qrcode', 'code scannen'],
    response: 'Der QR-Code ist der einfachste Weg für Gäste:\n1. Gast scannt den Code mit der Kamera\n2. Event-Seite öffnet sich automatisch\n3. Gast kann sofort Fotos hochladen\n\n📥 Du findest deinen QR-Code im Dashboard unter "QR-Code". Dort kannst du ihn auch als PDF herunterladen.'
  },
  'album': {
    keywords: ['album erstellen', 'album', 'alben', 'fotos sortieren'],
    response: 'So erstellst du ein Album:\n1. Gehe zu "Alben" im Dashboard\n2. Klicke auf "+ Neues Album"\n3. Gib einen Namen ein\n\nFotos hinzufügen:\n- In der Galerie: Foto lange drücken → "Zu Album hinzufügen"'
  },
  'gesichtserkennung': {
    keywords: ['gesichtserkennung', 'finde mich', 'mein foto', 'selfie', 'face search'],
    response: '"Finde mein Foto" nutzt KI-Gesichtserkennung:\n1. Tippe auf das Gesichts-Symbol (👤)\n2. Mache ein Selfie\n3. Die App findet alle Fotos, auf denen du bist\n\n🔒 Dein Selfie wird nur temporär verwendet und nicht gespeichert.'
  },
  'upload-problem': {
    keywords: ['upload funktioniert nicht', 'foto lädt nicht', 'upload fehler', 'hochladen geht nicht'],
    response: 'Upload-Probleme lösen:\n\n1. **Verbindung prüfen** - WLAN oder mobile Daten aktiv?\n2. **Dateigröße** - Max. 50 MB pro Foto\n3. **Format** - JPG, PNG, HEIC werden unterstützt\n4. **Browser** - Versuche Chrome oder Safari\n\nWenn es weiterhin nicht funktioniert, lade die Seite neu und versuche es erneut.'
  },
  'challenge': {
    keywords: ['challenge', 'foto challenge', 'aufgabe', 'challenges'],
    response: 'Foto-Challenges motivieren deine Gäste!\n\nSo erstellst du eine:\n1. Gehe zu "Challenges" im Dashboard\n2. Klicke auf "+ Neue Challenge"\n3. Gib Titel und Beschreibung ein\n\n💡 Nutze die KI-Vorschläge für kreative Ideen!'
  },
  'gaestebuch': {
    keywords: ['gästebuch', 'nachricht', 'grüße', 'wünsche'],
    response: 'Das digitale Gästebuch:\n\n1. Aktiviere es unter "Gästebuch" im Dashboard\n2. Füge optional eine Willkommensnachricht hinzu\n3. Gäste können Text und Sprachnachrichten hinterlassen\n\n📥 Du kannst das Gästebuch später als PDF exportieren!'
  }
};

function findFAQResponse(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  for (const [, faq] of Object.entries(FAQ_KEYWORDS)) {
    for (const keyword of faq.keywords) {
      if (lowerMessage.includes(keyword)) {
        return faq.response;
      }
    }
  }
  
  return null;
}

function getCachedResponse(message: string): string | null {
  const key = message.toLowerCase().trim();
  const cached = responseCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  
  return null;
}

function cacheResponse(message: string, response: string): void {
  const key = message.toLowerCase().trim();
  responseCache.set(key, { response, timestamp: Date.now() });
}

/**
 * POST /api/ai/chat
 * Chat with the AI bot - uses FAQ cache first, then Groq
 */
router.post('/chat', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Nachricht ist erforderlich' });
    }
    
    // 1. Check FAQ cache first (0 API calls)
    const faqResponse = findFAQResponse(message);
    if (faqResponse) {
      return res.json({ response: faqResponse, source: 'faq' });
    }
    
    // 2. Check response cache (0 API calls)
    const cachedResponse = getCachedResponse(message);
    if (cachedResponse) {
      return res.json({ response: cachedResponse, source: 'cache' });
    }
    
    // 3. Call Groq API (1 API call)
    const systemPrompt = `Du bist der freundliche KI-Assistent von gästefotos.com, einer App für Event-Fotogalerien.
Deine Aufgabe ist es, Hosts (Event-Ersteller) bei Fragen zu helfen.
Antworte kurz, freundlich und auf Deutsch.
Nutze Emojis sparsam aber passend.
Fokussiere dich auf praktische Hilfe.

Die App bietet:
- Event-Fotogalerien mit QR-Code-Zugang
- Gesichtserkennung "Finde mein Foto"
- Alben und Foto-Challenges
- Digitales Gästebuch
- Co-Host Einladungen`;

    const response = await groqService.complete(systemPrompt, message);
    
    // Cache the response for future use
    cacheResponse(message, response);
    
    res.json({ response, source: 'ai' });
  } catch (error) {
    logger.error('Error in chat:', { error: (error as Error).message });
    res.status(500).json({ 
      response: 'Entschuldigung, ich konnte deine Frage gerade nicht beantworten. Bitte versuche es erneut.',
      error: true 
    });
  }
});

/**
 * POST /api/ai/suggest-colors
 * Generate color scheme suggestions based on event type
 */
router.post('/suggest-colors', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventType, keywords, mood } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType ist erforderlich' });
    }
    
    const schemes = await groqService.suggestColorScheme(
      eventType,
      keywords || [],
      mood
    );
    
    res.json({ schemes });
  } catch (error) {
    logger.error('Error generating color schemes:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler bei der Farbschema-Generierung' });
  }
});

export default router;
