import { Router, Request, Response } from 'express';
import groqService from '../lib/groq';
import { getActiveProviderInfo } from '../lib/llmClient';
import { logger } from '../utils/logger';
import { getKnowledgeStats, seedKnowledge, knowledgeGet, knowledgeSet, listEntries, migrateFromRedisCache, isAiOnline, type KnowledgeFeature } from '../services/cache/knowledgeStore';

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
    
    const albums = await groqService.suggestAlbums({ eventType, eventTitle });
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
    
    const description = await groqService.suggestDescription({ eventType, eventTitle, eventDate });
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
    
    const text = await groqService.suggestInvitationText({ eventType, eventTitle, hostName });
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
    
    const challenges = await groqService.suggestChallenges({ eventType });
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
    
    const message = await groqService.suggestGuestbookMessage({ eventType, eventTitle });
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
    
    const schemes = await groqService.suggestColorScheme({
      eventType,
      keywords: keywords || [],
      mood,
    });
    
    res.json({ schemes });
  } catch (error) {
    logger.error('Error generating color schemes:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler bei der Farbschema-Generierung' });
  }
});

// ===== KNOWLEDGE STORE MANAGEMENT (Admin) =====

/**
 * GET /api/ai/cache/stats
 * Gibt Knowledge Store Statistiken zurück
 */
router.get('/cache/stats', async (_req: Request, res: Response) => {
  try {
    const [stats, online] = await Promise.all([
      getKnowledgeStats(),
      isAiOnline(),
    ]);

    res.json({
      stats,
      entries: stats.features,
      aiOnline: online,
      offlineReady: stats.totalEntries > 0,
    });
  } catch (error) {
    logger.error('Error getting knowledge stats:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

/**
 * GET /api/ai/cache/entries
 * Listet Knowledge Store Einträge (für Admin-UI)
 */
router.get('/cache/entries', async (req: Request, res: Response) => {
  try {
    const { feature, eventType, search, limit, offset, orderBy } = req.query;
    const result = await listEntries({
      feature: feature as string,
      eventType: eventType as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      orderBy: (orderBy as any) || 'hitCount',
    });
    res.json(result);
  } catch (error) {
    logger.error('Error listing entries:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

/**
 * POST /api/ai/cache/seed
 * Füllt den Knowledge Store mit häufigen Anfragen vor (Seeding)
 */
router.post('/cache/seed', async (req: Request, res: Response) => {
  try {
    const { eventTypes } = req.body;

    const online = await isAiOnline();
    if (!online) {
      return res.status(503).json({
        error: 'AI-Provider nicht erreichbar. Seeding benötigt Internet.',
      });
    }

    // Generate-Funktion die den groqService nutzt
    const generateFn = async (feature: KnowledgeFeature, params: Record<string, any>) => {
      switch (feature) {
        case 'suggest-albums':
          return groqService.suggestAlbums({ eventType: params.eventType, eventTitle: params.eventTitle });
        case 'suggest-description':
          return groqService.suggestDescription({ eventType: params.eventType, eventTitle: params.eventTitle || 'Event' });
        case 'suggest-invitation':
          return groqService.suggestInvitationText({ eventType: params.eventType, eventTitle: params.eventTitle || 'Event' });
        case 'suggest-challenges':
          return groqService.suggestChallenges({ eventType: params.eventType });
        case 'suggest-guestbook':
          return groqService.suggestGuestbookMessage({ eventType: params.eventType, eventTitle: params.eventTitle || 'Event' });
        case 'suggest-colors':
          return groqService.suggestColorScheme({ eventType: params.eventType });
        case 'suggest-theme':
          return groqService.suggestTheme({ eventType: params.eventType, season: params.season });
        default:
          return null;
      }
    };

    const result = await seedKnowledge(generateFn, eventTypes);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error seeding knowledge store:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Seeding' });
  }
});

/**
 * POST /api/ai/cache/warm-up
 * Legacy-Endpoint → leitet auf Seeding weiter
 */
router.post('/cache/warm-up', async (req: Request, res: Response) => {
  try {
    const { eventTypes } = req.body;

    const online = await isAiOnline();
    if (!online) {
      return res.status(503).json({
        error: 'AI-Provider nicht erreichbar. Seeding benötigt Internet.',
      });
    }

    const generateFn = async (feature: KnowledgeFeature, params: Record<string, any>) => {
      switch (feature) {
        case 'suggest-albums':
          return groqService.suggestAlbums({ eventType: params.eventType, eventTitle: params.eventTitle });
        case 'suggest-description':
          return groqService.suggestDescription({ eventType: params.eventType, eventTitle: params.eventTitle || 'Event' });
        case 'suggest-invitation':
          return groqService.suggestInvitationText({ eventType: params.eventType, eventTitle: params.eventTitle || 'Event' });
        case 'suggest-challenges':
          return groqService.suggestChallenges({ eventType: params.eventType });
        case 'suggest-guestbook':
          return groqService.suggestGuestbookMessage({ eventType: params.eventType, eventTitle: params.eventTitle || 'Event' });
        case 'suggest-colors':
          return groqService.suggestColorScheme({ eventType: params.eventType });
        case 'suggest-theme':
          return groqService.suggestTheme({ eventType: params.eventType, season: params.season });
        default:
          return null;
      }
    };

    const result = await seedKnowledge(generateFn, eventTypes);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error seeding:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Seeding' });
  }
});

/**
 * POST /api/ai/cache/seed-offline
 * Füllt den Knowledge Store mit vorgenerierten Fallback-Daten
 * Benötigt KEINEN aktiven AI-Provider
 */
router.post('/cache/seed-offline', async (req: Request, res: Response) => {
  try {
    const eventTypes = req.body.eventTypes || ['wedding', 'party', 'business', 'family', 'milestone', 'custom'];
    let seeded = 0, skipped = 0;

    // Pre-generated descriptions
    const descriptions: Record<string, Record<string, string>> = {
      wedding: {
        'Unsere Hochzeit': 'Willkommen bei unserer Hochzeit! 💍📸 Haltet die schönsten Momente fest und teilt eure Fotos mit uns.',
        'Hochzeit': 'Feiert mit uns den schönsten Tag! 🥂📸 Ladet eure Fotos hoch und lasst uns gemeinsam Erinnerungen schaffen.',
        'Traumhochzeit': 'Unsere Traumhochzeit — teilt eure Perspektive! ✨📸 Jedes Foto erzählt eine Geschichte.',
      },
      party: {
        'Feier': 'Willkommen zur Feier! 🎉📸 Fangt die besten Momente ein und teilt sie mit allen.',
        'Party': 'Let\'s party! 🎊📸 Teilt eure Schnappschüsse und lasst die Stimmung aufleben.',
        'Geburtstagsparty': 'Happy Birthday! 🎂📸 Haltet die Partystimmung in Bildern fest.',
      },
      business: {
        'Firmenfeier': 'Willkommen zur Firmenfeier! 🏢📸 Dokumentiert den Team-Spirit.',
        'Teambuilding': 'Teambuilding-Event! 🤝📸 Zeigt euren Zusammenhalt in Bildern.',
        'Konferenz': 'Willkommen zur Konferenz! 🎤📸 Teilt eure Eindrücke und Networking-Momente.',
        'Weihnachtsfeier': 'Frohe Weihnachten! 🎄📸 Haltet die festliche Stimmung in Fotos fest.',
      },
      family: {
        'Familientreffen': 'Schön, dass wir zusammen sind! 👨‍👩‍👧‍👦📸 Haltet unsere gemeinsamen Momente fest.',
        'Familienfeier': 'Willkommen zur Familienfeier! 🏡📸 Jedes Foto wird zur wertvollen Erinnerung.',
      },
      milestone: {
        'Geburtstag': 'Alles Gute zum Geburtstag! 🎉📸 Teilt eure liebsten Momente der Feier.',
        'Jubiläum': 'Ein besonderes Jubiläum! 🥂📸 Lasst uns gemeinsam feiern und Erinnerungen schaffen.',
        '50. Geburtstag': 'Happy 50! 🎂🥳 Ein halbes Jahrhundert voller Geschichten — haltet diesen Meilenstein fest!',
      },
      custom: {
        'Event': 'Willkommen zum Event! 📸 Teilt eure schönsten Momente mit allen Gästen.',
        'Veranstaltung': 'Herzlich willkommen! 🎉📸 Fangt die Highlights ein und teilt eure Perspektive.',
      },
    };

    // Pre-generated invitation texts
    const invitations: Record<string, Record<string, string>> = {
      wedding: {
        'Unsere Hochzeit': 'Wir freuen uns riesig, dass ihr dabei seid! 💒💕 Macht Fotos von allem, was euch begeistert — jeder Schnappschuss wird Teil unserer Hochzeitserinnerung.',
        'Hochzeit': 'Haltet die schönsten Momente unserer Hochzeit fest! 📸✨ Ladet eure Fotos hoch und lasst uns gemeinsam ein wunderbares Album erstellen.',
        'Traumhochzeit': 'Ihr seid Teil unserer Traumhochzeit! 💍🥂 Teilt eure einzigartigen Blickwinkel — gemeinsam schaffen wir unvergessliche Erinnerungen.',
      },
      party: {
        'Feier': 'Seid ihr bereit für eine unvergessliche Feier? 🎉📸 Macht Fotos und teilt die besten Momente!',
        'Party': 'Party-Time! 🎊🎶 Schnappt euch eure Handys und haltet die wildesten Momente fest.',
        'Geburtstagsparty': 'Feiert mit uns und macht Fotos! 🎂📸 Jeder Schnappschuss macht die Party noch unvergesslicher.',
      },
      business: {
        'Firmenfeier': 'Willkommen zur Firmenfeier! 🏢🥂 Dokumentiert den Teamgeist und teilt eure Eindrücke.',
        'Teambuilding': 'Zeigt euren Team-Spirit! 🤝📸 Ladet eure Teambuilding-Fotos hoch und feiert den Zusammenhalt.',
        'Konferenz': 'Teilt eure Konferenz-Erlebnisse! 🎤💡 Von Vorträgen bis Networking — jeder Moment zählt.',
        'Weihnachtsfeier': 'Ho Ho Ho! 🎄🎅 Haltet die festlichen Momente unserer Weihnachtsfeier in Bildern fest.',
      },
      family: {
        'Familientreffen': 'Familie ist alles! 👨‍👩‍👧‍👦💕 Macht Fotos von unseren gemeinsamen Momenten und teilt sie mit der ganzen Familie.',
        'Familienfeier': 'Schön, dass wir zusammen feiern! 🏡📸 Haltet die wertvollsten Familienmomente fest.',
      },
      milestone: {
        'Geburtstag': 'Feiert mit und macht Fotos! 🎉📸 Jeder Schnappschuss macht den Tag noch besonderer.',
        'Jubiläum': 'Ein besonderer Anlass verdient besondere Erinnerungen! 🥂📸 Teilt eure schönsten Momente.',
        '50. Geburtstag': 'Ein halbes Jahrhundert — das muss gefeiert werden! 🎂🎉 Haltet jeden goldenen Moment fest.',
      },
      custom: {
        'Event': 'Willkommen! 📸 Teilt eure Fotos und macht dieses Event unvergesslich.',
        'Veranstaltung': 'Schön, dass ihr da seid! 🎉📸 Ladet eure Fotos hoch und haltet die Highlights fest.',
      },
    };

    // Pre-generated guestbook messages
    const guestbookMessages: Record<string, Record<string, string>> = {
      wedding: {
        'Unsere Hochzeit': 'Hinterlasst eure Glückwünsche für das Brautpaar! 💝 Eure Worte werden für immer in Erinnerung bleiben.',
        'Hochzeit': 'Schreibt dem Brautpaar eure herzlichsten Wünsche! 💒💕 Jede Nachricht ist ein Geschenk.',
        'Traumhochzeit': 'Teilt eure Grüße und Wünsche! ✨💝 Eure Worte machen diesen Tag noch magischer.',
      },
      party: {
        'Feier': 'Hinterlasst einen Gruß! 🎉 Erzählt von eurem Lieblingsmoment der Feier.',
        'Party': 'Party-Grüße! 🎊 Schreibt, was euch am meisten begeistert hat.',
        'Geburtstagsparty': 'Happy Birthday-Wünsche hier! 🎂💕 Schreibt eure persönlichen Glückwünsche.',
      },
      business: {
        'Firmenfeier': 'Teilt eure Eindrücke! 🏢 Was war euer Highlight des Abends?',
        'Teambuilding': 'Team-Feedback! 🤝 Was habt ihr heute über euer Team gelernt?',
        'Konferenz': 'Konferenz-Feedback! 🎤 Teilt eure wichtigsten Takeaways.',
        'Weihnachtsfeier': 'Frohe Weihnachten! 🎄 Hinterlasst eure festlichen Grüße.',
      },
      family: {
        'Familientreffen': 'Familien-Gästebuch! 👨‍👩‍👧‍👦💕 Hinterlasst Grüße für die ganze Familie.',
        'Familienfeier': 'Schreibt eure schönsten Familienerinnerungen! 🏡💝',
      },
      milestone: {
        'Geburtstag': 'Herzlichen Glückwunsch! 🎉 Hinterlasst eure persönlichen Geburtstagswünsche.',
        'Jubiläum': 'Gratulation zum Jubiläum! 🥂 Teilt eure Erinnerungen und Wünsche.',
        '50. Geburtstag': 'Happy 50! 🎂 Schreibt eure schönsten Erinnerungen und Wünsche für die nächsten 50 Jahre.',
      },
      custom: {
        'Event': 'Herzlich willkommen im Gästebuch! 📝 Hinterlasst eure Grüße und Eindrücke.',
        'Veranstaltung': 'Teilt eure Gedanken! 💝 Jede Nachricht bereichert unsere Erinnerungen.',
      },
    };

    const commonTitles: Record<string, string[]> = {
      wedding: ['Unsere Hochzeit', 'Hochzeit', 'Traumhochzeit'],
      party: ['Feier', 'Party', 'Geburtstagsparty'],
      business: ['Firmenfeier', 'Teambuilding', 'Konferenz', 'Weihnachtsfeier'],
      family: ['Familientreffen', 'Familienfeier'],
      milestone: ['Geburtstag', 'Jubiläum', '50. Geburtstag'],
      custom: ['Event', 'Veranstaltung'],
    };

    for (const eventType of eventTypes) {
      // Albums (no title needed)
      const albums = getDefaultAlbumsFallback(eventType);
      const albumsExisting = await knowledgeGet('suggest-albums', { eventType });
      if (!albumsExisting) {
        await knowledgeSet('suggest-albums', { eventType }, albums, { provider: 'offline-seed', quality: 0.85, isPinned: true });
        seeded++;
      } else { skipped++; }

      // Challenges (no title needed)
      const challenges = getDefaultChallengesFallback(eventType);
      const challengesExisting = await knowledgeGet('suggest-challenges', { eventType });
      if (!challengesExisting) {
        await knowledgeSet('suggest-challenges', { eventType }, challenges, { provider: 'offline-seed', quality: 0.85, isPinned: true });
        seeded++;
      } else { skipped++; }

      // Colors (no title needed)
      const colors = getDefaultColorSchemesFallback(eventType);
      const colorsExisting = await knowledgeGet('suggest-colors', { eventType });
      if (!colorsExisting) {
        await knowledgeSet('suggest-colors', { eventType }, colors, { provider: 'offline-seed', quality: 0.85, isPinned: true });
        seeded++;
      } else { skipped++; }

      // Title-based features: description, invitation, guestbook
      const titles = commonTitles[eventType] || commonTitles.custom;
      for (const title of titles) {
        // Description
        const desc = descriptions[eventType]?.[title];
        if (desc) {
          const descExisting = await knowledgeGet('suggest-description', { eventType, eventTitle: title });
          if (!descExisting) {
            await knowledgeSet('suggest-description', { eventType, eventTitle: title }, desc, { provider: 'offline-seed', quality: 0.85, isPinned: true });
            seeded++;
          } else { skipped++; }
        }

        // Invitation
        const inv = invitations[eventType]?.[title];
        if (inv) {
          const invExisting = await knowledgeGet('suggest-invitation', { eventType, eventTitle: title });
          if (!invExisting) {
            await knowledgeSet('suggest-invitation', { eventType, eventTitle: title }, inv, { provider: 'offline-seed', quality: 0.85, isPinned: true });
            seeded++;
          } else { skipped++; }
        }

        // Guestbook
        const gb = guestbookMessages[eventType]?.[title];
        if (gb) {
          const gbExisting = await knowledgeGet('suggest-guestbook', { eventType, eventTitle: title });
          if (!gbExisting) {
            await knowledgeSet('suggest-guestbook', { eventType, eventTitle: title }, gb, { provider: 'offline-seed', quality: 0.85, isPinned: true });
            seeded++;
          } else { skipped++; }
        }
      }
    }

    logger.info('[KnowledgeStore] Offline seeding complete', { seeded, skipped });
    res.json({ success: true, seeded, skipped, errors: 0, mode: 'offline' });
  } catch (error) {
    logger.error('Error offline seeding:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Offline-Seeding' });
  }
});

// Helper fallbacks for offline seeding
function getDefaultAlbumsFallback(eventType: string): string[] {
  const defaults: Record<string, string[]> = {
    wedding: ['Getting Ready', 'Trauung', 'Empfang', 'Tortenanschnitt', 'Party'],
    family: ['Ankommen', 'Feier', 'Gruppenfoto', 'Besondere Momente'],
    milestone: ['Vorbereitung', 'Feier', 'Geschenke', 'Erinnerungen'],
    business: ['Empfang', 'Vorträge', 'Networking', 'Team'],
    party: ['Ankommen', 'Party', 'Highlights', 'Ende'],
    custom: ['Allgemein', 'Highlights', 'Besondere Momente'],
  };
  return defaults[eventType] || defaults.custom;
}

function getDefaultChallengesFallback(eventType: string): { title: string; description: string }[] {
  const defaults: Record<string, { title: string; description: string }[]> = {
    wedding: [
      { title: 'Selfie mit Brautpaar', description: 'Macht ein Selfie mit den Frischvermählten!' },
      { title: 'Tanzflächen-Schnappschuss', description: 'Zeigt eure besten Moves auf der Tanzfläche!' },
      { title: 'Deko-Detail', description: 'Findet das schönste Deko-Element!' },
      { title: 'Lieblingsmoment', description: 'Fangt euren emotionalsten Moment ein!' },
      { title: 'Vintage-Foto', description: 'Macht ein Foto im Retro-Stil!' },
    ],
    party: [
      { title: 'Gruppenfoto', description: 'Alle zusammen auf einem Bild!' },
      { title: 'Dance Moves', description: 'Zeigt eure besten Tanzschritte!' },
      { title: 'Bestes Outfit', description: 'Wer hat das coolste Outfit?' },
      { title: 'Party-Animal', description: 'Wer feiert am wildesten?' },
      { title: 'Mitternachts-Selfie', description: 'Ein Selfie um Mitternacht!' },
    ],
    business: [
      { title: 'Team-Spirit', description: 'Zeigt euren Team-Zusammenhalt!' },
      { title: 'Networking in Action', description: 'Die besten Gespräche dokumentiert!' },
      { title: 'Behind the Scenes', description: 'Was passiert hinter den Kulissen?' },
      { title: 'Office-Fun', description: 'Der lustigste Moment im Büro/Event!' },
      { title: 'Success-Pose', description: 'Eure beste Erfolgs-Pose!' },
    ],
    family: [
      { title: 'Generationen-Foto', description: 'Alle Generationen auf einem Bild!' },
      { title: 'Kinderlachen', description: 'Fangt das schönste Kinderlachen ein!' },
      { title: 'Familien-Selfie', description: 'Ein Selfie mit möglichst vielen Familienmitgliedern!' },
      { title: 'Tischmoment', description: 'Der lustigste Moment am Tisch!' },
      { title: 'Verwandtschafts-Quiz', description: 'Wer erkennt wen? Macht Rätsel-Fotos!' },
    ],
    milestone: [
      { title: 'Selfie mit Geburtstagskind', description: 'Ein Selfie mit dem Star des Tages!' },
      { title: 'Tortenanschnitt', description: 'Der magische Moment mit der Torte!' },
      { title: 'Geschenke-Chaos', description: 'Zeigt den Geschenke-Berg!' },
      { title: 'Party-Stimmung', description: 'Fangt die ausgelassenste Stimmung ein!' },
      { title: 'Überraschungsmoment', description: 'Der beste Überraschungs-Gesichtsausdruck!' },
    ],
    custom: [
      { title: 'Gruppenfoto', description: 'Sammelt so viele Leute wie möglich für ein Foto!' },
      { title: 'Bestes Lachen', description: 'Fangt den lustigsten Moment ein!' },
      { title: 'Food-Foto', description: 'Zeigt das leckerste Essen!' },
      { title: 'Schnappschuss', description: 'Der spontanste Moment des Events!' },
      { title: 'Best Dressed', description: 'Wer ist am schicksten gekleidet?' },
    ],
  };
  return defaults[eventType] || defaults.custom;
}

function getDefaultColorSchemesFallback(eventType: string): { primary: string; secondary: string; accent: string; background: string; name: string }[] {
  const defaults: Record<string, { primary: string; secondary: string; accent: string; background: string; name: string }[]> = {
    wedding: [
      { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FFD700', background: '#FFF8F0', name: 'Romantisches Rosa' },
      { primary: '#8B5A2B', secondary: '#F5E6D3', accent: '#D4AF37', background: '#FFFBF5', name: 'Elegantes Gold' },
      { primary: '#2E7D32', secondary: '#E8F5E9', accent: '#FFB74D', background: '#FAFFF5', name: 'Natürliches Grün' },
      { primary: '#5E35B1', secondary: '#EDE7F6', accent: '#FFD54F', background: '#FAF5FF', name: 'Royales Violett' },
    ],
    party: [
      { primary: '#FF5722', secondary: '#FBE9E7', accent: '#FFEB3B', background: '#FFFDE7', name: 'Party Orange' },
      { primary: '#9C27B0', secondary: '#F3E5F5', accent: '#00BCD4', background: '#F5F5F5', name: 'Disco Neon' },
      { primary: '#E91E63', secondary: '#FCE4EC', accent: '#4CAF50', background: '#FAFAFA', name: 'Pink Party' },
      { primary: '#3F51B5', secondary: '#E8EAF6', accent: '#FF4081', background: '#F5F5F5', name: 'Nacht Blau' },
    ],
    business: [
      { primary: '#1976D2', secondary: '#E3F2FD', accent: '#FF9800', background: '#FAFAFA', name: 'Business Blau' },
      { primary: '#455A64', secondary: '#ECEFF1', accent: '#00BCD4', background: '#FFFFFF', name: 'Modern Grau' },
      { primary: '#00695C', secondary: '#E0F2F1', accent: '#FFC107', background: '#FAFAFA', name: 'Professionelles Teal' },
      { primary: '#37474F', secondary: '#F5F5F5', accent: '#7C4DFF', background: '#FFFFFF', name: 'Elegant Dunkel' },
    ],
    family: [
      { primary: '#4CAF50', secondary: '#E8F5E9', accent: '#FF9800', background: '#FFFDE7', name: 'Familien Grün' },
      { primary: '#2196F3', secondary: '#E3F2FD', accent: '#FFEB3B', background: '#FAFAFA', name: 'Freundliches Blau' },
      { primary: '#FF7043', secondary: '#FBE9E7', accent: '#8BC34A', background: '#FFF8E1', name: 'Warmes Orange' },
      { primary: '#7B1FA2', secondary: '#F3E5F5', accent: '#4DB6AC', background: '#FAFAFA', name: 'Verspieltes Lila' },
    ],
  };
  const defaultSchemes = [
    { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FFD700', background: '#FFF8F0', name: 'Klassisch Rosa' },
    { primary: '#3F51B5', secondary: '#E8EAF6', accent: '#FF9800', background: '#FAFAFA', name: 'Modern Blau' },
    { primary: '#4CAF50', secondary: '#E8F5E9', accent: '#FFC107', background: '#FFFDE7', name: 'Frisches Grün' },
    { primary: '#9C27B0', secondary: '#F3E5F5', accent: '#00BCD4', background: '#FAFAFA', name: 'Kreativ Lila' },
  ];
  return defaults[eventType] || defaultSchemes;
}

/**
 * POST /api/ai/cache/migrate
 * Migriert bestehende Redis-Cache-Einträge in den Knowledge Store
 */
router.post('/cache/migrate', async (_req: Request, res: Response) => {
  try {
    const result = await migrateFromRedisCache();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error migrating:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler bei der Migration' });
  }
});

/**
 * GET /api/ai/cache/online-status
 * Prüft ob AI-Provider erreichbar sind
 */
router.get('/cache/online-status', async (_req: Request, res: Response) => {
  try {
    const online = await isAiOnline();
    res.json({ online });
  } catch (error) {
    res.json({ online: false });
  }
});

export default router;
