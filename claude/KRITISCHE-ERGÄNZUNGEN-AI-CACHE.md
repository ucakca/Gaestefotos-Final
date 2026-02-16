# 🚨 KRITISCHE ERGÄNZUNGEN: AI-Cache & Event-Walls

> **Erstellt**: 2026-02-16  
> **Priorität**: 🔥 **KRITISCH** - MUSS vor Implementierung berücksichtigt werden!  
> **Referenz**: `claude/OPUS-MASTER-PLAN-DYNAMIC-THEMES.md`

---

## ⚠️ PROBLEM-ANALYSE

### User-Anforderungen (ESSENTIELL!)

1. ❌ **ALLE AI-Features** müssen hierarchisches Caching nutzen (nicht nur Theme-Generierung)
2. ❌ **AI-Cache** muss im Admin-Dashboard **sichtbar und verwaltbar** sein
3. ❌ **"Cache leeren"** Funktion muss **AI-Cache ausschließen** (zu teuer zum Regenerieren!)
4. ❌ **Event-Walls** (Live-Wall, Mosaic-Wall) müssen **Theme-Integration** erhalten

---

## ✅ LÖSUNGEN & IMPLEMENTIERUNG

### 1. HIERARCHISCHES CACHING FÜR ALLE AI-FEATURES

#### Betroffene Features (Alle nutzen AI!)

| Feature | Aktuell | Neu: Hierarchisches Caching |
|---------|---------|----------------------------|
| **Theme-Generierung** | ❌ Nicht implementiert | ✅ Hierarchisch (6 Levels) |
| **Album-Vorschläge** | ✅ Einfaches Caching (30d) | 🔄 Upgrade auf hierarchisch |
| **Überschriften-Generierung** | ✅ Einfaches Caching (30d) | 🔄 Upgrade auf hierarchisch |
| **Hashtag-Generierung** | ✅ Einfaches Caching (30d) | 🔄 Upgrade auf hierarchisch |
| **Foto-Analyse** (Face Search) | ❌ Kein Caching | ✅ Neu: Hierarchisch |
| **Challenge-Vorschläge** | ❌ Kein Caching | ✅ Neu: Hierarchisch |
| **Gästebuch-Sentiment** | ❌ Kein Caching | ✅ Neu: Hierarchisch |

#### Unified Caching Service

**Datei**: `packages/backend/src/services/unifiedAiCacheService.ts`

```typescript
/**
 * UNIFIED AI CACHE SERVICE
 * 
 * Hierarchisches Caching für ALLE AI-Features
 * Verhindert redundante AI-Calls und reduziert Kosten drastisch
 */

export enum AiFeatureType {
  THEME_GENERATION = 'theme-generation',
  ALBUM_SUGGESTIONS = 'album-suggestions',
  TITLE_GENERATION = 'title-generation',
  HASHTAG_GENERATION = 'hashtag-generation',
  PHOTO_ANALYSIS = 'photo-analysis',
  CHALLENGE_SUGGESTIONS = 'challenge-suggestions',
  GUESTBOOK_SENTIMENT = 'guestbook-sentiment',
  EVENT_DESCRIPTION = 'event-description',
}

interface CacheLevel {
  key: string;
  ttl: number; // in seconds
  buildKey: (feature: AiFeatureType, context: any) => string;
}

/**
 * CACHE-HIERARCHIE (Redis)
 * 
 * Level 1: System-Prompt (pro Feature, konstant)
 *   Key: "ai:cache:{feature}:system-prompt"
 *   TTL: never (permanent)
 * 
 * Level 2: Feature-Base-Knowledge (z.B. "Was sind typische Hochzeitsalben?")
 *   Key: "ai:cache:{feature}:knowledge:{eventType}"
 *   TTL: 90 Tage
 * 
 * Level 3: Seasonal-Knowledge (z.B. "Sommerfarben für Hochzeiten")
 *   Key: "ai:cache:{feature}:seasonal:{eventType}:{season}"
 *   TTL: 60 Tage
 * 
 * Level 4: Context-Specific (z.B. "Beach Wedding Albums")
 *   Key: "ai:cache:{feature}:context:{eventType}:{season}:{location}"
 *   TTL: 30 Tage
 * 
 * Level 5: User-Pattern (z.B. "Nutzer hat immer 'Selfie'-Album")
 *   Key: "ai:cache:{feature}:pattern:{userId}:{eventType}"
 *   TTL: 14 Tage
 * 
 * Level 6: Exact-Match (vollständiger Context-Hash)
 *   Key: "ai:cache:{feature}:exact:{contextHash}"
 *   TTL: 7 Tage
 */

const CACHE_LEVELS: CacheLevel[] = [
  {
    key: 'system-prompt',
    ttl: -1, // Never expire
    buildKey: (feature) => `ai:cache:${feature}:system-prompt`
  },
  {
    key: 'feature-knowledge',
    ttl: 90 * 24 * 60 * 60, // 90 days
    buildKey: (feature, ctx) => `ai:cache:${feature}:knowledge:${ctx.eventType || 'generic'}`
  },
  {
    key: 'seasonal-knowledge',
    ttl: 60 * 24 * 60 * 60, // 60 days
    buildKey: (feature, ctx) => `ai:cache:${feature}:seasonal:${ctx.eventType}:${ctx.season || 'any'}`
  },
  {
    key: 'context-specific',
    ttl: 30 * 24 * 60 * 60, // 30 days
    buildKey: (feature, ctx) => `ai:cache:${feature}:context:${ctx.eventType}:${ctx.season}:${ctx.locationStyle || 'any'}`
  },
  {
    key: 'user-pattern',
    ttl: 14 * 24 * 60 * 60, // 14 days
    buildKey: (feature, ctx) => `ai:cache:${feature}:pattern:${ctx.userId}:${ctx.eventType}`
  },
  {
    key: 'exact-match',
    ttl: 7 * 24 * 60 * 60, // 7 days
    buildKey: (feature, ctx) => `ai:cache:${feature}:exact:${hashContext(ctx)}`
  }
];

export class UnifiedAiCacheService {
  
  /**
   * Get cached AI response with hierarchical fallback
   */
  async getCached<T>(
    feature: AiFeatureType,
    context: any
  ): Promise<T | null> {
    // Try all cache levels from most specific to most general
    for (let i = CACHE_LEVELS.length - 1; i >= 0; i--) {
      const level = CACHE_LEVELS[i];
      const key = level.buildKey(feature, context);
      
      const cached = await redis.get(key);
      if (cached) {
        console.log(`🎯 Cache HIT: ${feature} @ ${level.key}`);
        await this.incrementHitRate(feature);
        return JSON.parse(cached);
      }
    }
    
    console.log(`❌ Cache MISS: ${feature}`);
    await this.incrementMissRate(feature);
    return null;
  }
  
  /**
   * Cache AI response in all appropriate levels
   */
  async setCached<T>(
    feature: AiFeatureType,
    context: any,
    data: T
  ): Promise<void> {
    const serialized = JSON.stringify(data);
    
    // Store in all applicable cache levels
    for (const level of CACHE_LEVELS) {
      if (level.ttl === -1) continue; // Skip system-prompt
      
      const key = level.buildKey(feature, context);
      const ttl = level.ttl;
      
      await redis.setex(key, ttl, serialized);
      console.log(`💾 Cached: ${feature} @ ${level.key} (TTL: ${ttl}s)`);
    }
    
    // Update stats
    await this.incrementCacheSize(feature);
  }
  
  /**
   * Get cache statistics for Admin-Dashboard
   */
  async getStats(): Promise<CacheStats> {
    const features = Object.values(AiFeatureType);
    const stats: Record<string, any> = {};
    
    for (const feature of features) {
      const hits = await redis.get(`ai:stats:${feature}:hits`) || '0';
      const misses = await redis.get(`ai:stats:${feature}:misses`) || '0';
      const size = await redis.get(`ai:stats:${feature}:size`) || '0';
      
      const totalCalls = parseInt(hits) + parseInt(misses);
      const hitRate = totalCalls > 0 ? (parseInt(hits) / totalCalls) * 100 : 0;
      
      stats[feature] = {
        hits: parseInt(hits),
        misses: parseInt(misses),
        size: parseInt(size),
        hitRate: hitRate.toFixed(2)
      };
    }
    
    return stats;
  }
  
  /**
   * Clear cache for specific feature (or all)
   * 
   * ⚠️ WICHTIG: Diese Funktion wird NICHT von "Cache leeren" Button aufgerufen!
   * AI-Cache ist zu teuer zum Regenerieren und sollte persistent bleiben.
   */
  async clearCache(feature?: AiFeatureType): Promise<void> {
    const pattern = feature 
      ? `ai:cache:${feature}:*` 
      : 'ai:cache:*';
    
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    console.log(`🗑️ Cleared ${keys.length} AI-Cache entries (${feature || 'all'})`);
  }
  
  /**
   * Warm-up cache for specific features & event types
   */
  async warmUp(
    features: AiFeatureType[],
    eventTypes: EventType[]
  ): Promise<{ cached: number; errors: number }> {
    let cached = 0;
    let errors = 0;
    
    for (const feature of features) {
      for (const eventType of eventTypes) {
        try {
          // Generate for all seasons
          for (const season of ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']) {
            const context = { eventType, season };
            
            // Check if already cached
            const existing = await this.getCached(feature, context);
            if (existing) continue;
            
            // Generate new AI response
            const response = await this.generateAiResponse(feature, context);
            await this.setCached(feature, context, response);
            
            cached++;
          }
        } catch (err) {
          console.error(`Warm-up failed for ${feature}:${eventType}`, err);
          errors++;
        }
      }
    }
    
    return { cached, errors };
  }
  
  private async generateAiResponse(feature: AiFeatureType, context: any): Promise<any> {
    // Delegate to appropriate AI service
    switch (feature) {
      case AiFeatureType.THEME_GENERATION:
        return await aiThemeGenerator.generateThemes(context);
      case AiFeatureType.ALBUM_SUGGESTIONS:
        return await aiService.generateAlbumSuggestions(context);
      case AiFeatureType.TITLE_GENERATION:
        return await aiService.generateTitle(context);
      // ... other features
      default:
        throw new Error(`Unknown feature: ${feature}`);
    }
  }
  
  private async incrementHitRate(feature: AiFeatureType) {
    await redis.incr(`ai:stats:${feature}:hits`);
  }
  
  private async incrementMissRate(feature: AiFeatureType) {
    await redis.incr(`ai:stats:${feature}:misses`);
  }
  
  private async incrementCacheSize(feature: AiFeatureType) {
    await redis.incr(`ai:stats:${feature}:size`);
  }
}

function hashContext(context: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(context))
    .digest('hex')
    .substring(0, 16);
}

export const unifiedAiCache = new UnifiedAiCacheService();
```

---

### 2. ADMIN-DASHBOARD: AI-CACHE-MANAGEMENT ERWEITERN

#### Bestehende Seite erweitern

**Datei**: `packages/admin-dashboard/src/app/(admin)/system/ai-cache/page.tsx`

**Änderungen**:

```typescript
// ⭐ NEU: Feature-Auswahl für Warm-Up
const AI_FEATURES = [
  { value: 'theme-generation', label: 'Theme-Generierung', icon: '🎨' },
  { value: 'album-suggestions', label: 'Album-Vorschläge', icon: '📁' },
  { value: 'title-generation', label: 'Titel-Generierung', icon: '✍️' },
  { value: 'hashtag-generation', label: 'Hashtag-Generierung', icon: '#️⃣' },
  { value: 'photo-analysis', label: 'Foto-Analyse', icon: '🔍' },
  { value: 'challenge-suggestions', label: 'Challenge-Vorschläge', icon: '🎯' },
];

// ⭐ NEU: Stats nach Feature gruppiert
{stats && stats.byFeature && (
  <div className="rounded-xl border border-app-border bg-app-card p-6">
    <h3 className="font-semibold text-app-fg mb-4">Cache-Performance nach Feature</h3>
    <div className="space-y-3">
      {Object.entries(stats.byFeature).map(([feature, data]: [string, any]) => (
        <div key={feature} className="flex items-center justify-between p-3 bg-app-bg rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {AI_FEATURES.find(f => f.value === feature)?.icon || '🤖'}
            </span>
            <div>
              <div className="text-sm font-medium text-app-fg">
                {AI_FEATURES.find(f => f.value === feature)?.label || feature}
              </div>
              <div className="text-xs text-app-muted">
                {data.size} Einträge • {data.hits} Hits • {data.misses} Misses
              </div>
            </div>
          </div>
          <div className={`text-lg font-bold ${hitRateColor(data.hitRate)}`}>
            {data.hitRate}%
          </div>
        </div>
      ))}
    </div>
  </div>
)}

// ⭐ NEU: Feature-Auswahl für Warm-Up
<div className="mb-4">
  <div className="text-sm text-app-muted mb-2">Features auswählen:</div>
  <div className="flex flex-wrap gap-2">
    {AI_FEATURES.map((feature) => (
      <button
        key={feature.value}
        onClick={() => toggleFeature(feature.value)}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedFeatures.includes(feature.value)
            ? 'bg-app-accent text-white'
            : 'bg-app-bg border border-app-border text-app-muted hover:text-app-fg'
        }`}
      >
        {feature.icon} {feature.label}
      </button>
    ))}
  </div>
</div>

// ⭐ WICHTIG: Warnung bei Cache-Löschen
<div className="rounded-xl border border-destructive/30 bg-destructive/100/5 p-6">
  <h3 className="font-semibold text-destructive mb-2">⚠️ Gefahrenzone</h3>
  <p className="text-sm text-app-muted mb-4">
    <strong>ACHTUNG:</strong> Das Leeren des AI-Cache kann die Performance stark beeinträchtigen
    und hohe Kosten verursachen (bis zu €500+ bis Cache wieder aufgebaut ist).
    <br /><br />
    <strong>Hinweis:</strong> Die normale "Cache leeren" Funktion (Sidebar) löscht den AI-Cache NICHT.
    Diese Funktion hier ist nur für Notfälle gedacht.
  </p>
  
  {/* Feature-spezifisches Löschen */}
  <div className="mb-4">
    <label className="text-sm text-app-muted mb-2 block">Welches Feature leeren?</label>
    <select 
      value={featureToDelete} 
      onChange={(e) => setFeatureToDelete(e.target.value)}
      className="px-3 py-2 rounded-lg border border-app-border bg-app-card text-app-fg"
    >
      <option value="all">🔥 ALLE Features (GEFÄHRLICH!)</option>
      {AI_FEATURES.map(f => (
        <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
      ))}
    </select>
  </div>
  
  <Button
    variant="outline"
    onClick={() => handleClearCache(featureToDelete)}
    disabled={clearing}
    className="border-destructive/50 text-destructive hover:bg-destructive/100/10"
  >
    {clearing ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Leeren...
      </>
    ) : (
      <>
        <Trash2 className="w-4 h-4 mr-2" />
        {featureToDelete === 'all' 
          ? '🔥 ALLES leeren (GEFÄHRLICH!)' 
          : `Cache für ${AI_FEATURES.find(f => f.value === featureToDelete)?.label} leeren`
        }
      </>
    )}
  </Button>
</div>
```

---

### 3. "CACHE LEEREN" BUTTON: AI-CACHE AUSSCHLIESSEN

#### Problem
Die bestehende "Cache leeren" Funktion (Sidebar-Button) löscht aktuell **ALLE** Redis-Keys, inklusive AI-Cache.

**Das ist problematisch weil:**
- AI-Cache ist teuer zu regenerieren (€100-500+)
- AI-Cache sollte persistent bleiben (lange TTLs: 7-90 Tage)
- Nur Session-Cache, UI-Cache, etc. sollten gelöscht werden

#### Lösung

**Datei**: `packages/backend/src/routes/adminCache.ts` (oder wo "Cache leeren" implementiert ist)

```typescript
// ❌ VORHER: Löscht ALLES
router.delete('/cache', adminMiddleware, async (req, res) => {
  await redis.flushall(); // ⚠️ Löscht auch AI-Cache!
  res.json({ success: true });
});

// ✅ NACHHER: AI-Cache wird ausgeschlossen
router.delete('/cache', adminMiddleware, async (req, res) => {
  try {
    // Alle Keys holen
    const allKeys = await redis.keys('*');
    
    // AI-Cache-Keys herausfiltern
    const nonAiKeys = allKeys.filter(key => !key.startsWith('ai:cache:'));
    
    // Nur Nicht-AI-Keys löschen
    if (nonAiKeys.length > 0) {
      await redis.del(...nonAiKeys);
    }
    
    console.log(`🗑️ Cleared ${nonAiKeys.length} cache entries (AI-Cache protected)`);
    
    res.json({ 
      success: true, 
      cleared: nonAiKeys.length,
      protected: allKeys.length - nonAiKeys.length 
    });
  } catch (error) {
    console.error('Cache clear failed:', error);
    res.status(500).json({ error: 'Cache clear failed' });
  }
});
```

**Alternative (Performance-optimiert)**:

```typescript
// ✅ BESSER: Verwende separate Redis-Datenbanken
// DB 0: Standard-Cache (Session, UI, etc.)
// DB 1: AI-Cache (persistent)

// In cacheService.ts
export const standardCache = redis.createClient({ db: 0 });
export const aiCache = redis.createClient({ db: 1 });

// In adminCache.ts
router.delete('/cache', adminMiddleware, async (req, res) => {
  // Nur Standard-Cache leeren, AI-Cache bleibt intakt
  await standardCache.flushdb();
  
  res.json({ success: true, message: 'Standard-Cache geleert (AI-Cache geschützt)' });
});
```

---

### 4. EVENT-WALLS: THEME-INTEGRATION

#### Betroffene Komponenten

1. **Live-Wall** (`/live/[slug]/wall/page.tsx`)
2. **Mosaic-Wall** (`/live/[slug]/mosaic/page.tsx`)

#### Warum wichtig?
Event-Walls sind die **öffentlich sichtbaren Kern-Features**:
- Gäste sehen Fotos in Echtzeit
- Werden auf Großbildschirmen/Beamern angezeigt
- **MÜSSEN** mit Event-Theme konsistent sein!

#### Implementation

**Datei**: `packages/frontend/src/app/live/[slug]/wall/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { ThemeAnimation } from '@/components/theme/ThemeAnimation';
import { AmbientAnimation } from '@/components/theme/AmbientAnimation';

export default function LiveWallPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [event, setEvent] = useState<any>(null);
  const [theme, setTheme] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    // Load event with theme
    fetch(`/api/events?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        setEvent(data);
        
        // Load theme if event has one
        if (data.themeId) {
          fetch(`/api/themes/${data.themeId}`)
            .then(res => res.json())
            .then(themeData => {
              // Merge with custom theme data
              const finalTheme = {
                ...themeData,
                colors: {
                  ...themeData.colors,
                  ...(data.designConfig?.customThemeData?.colorOverrides || {})
                }
              };
              setTheme(finalTheme);
            });
        }
      });
    
    // Setup realtime photo updates
    const socket = io();
    socket.on('new-photo', (photo) => {
      setPhotos(prev => [photo, ...prev]);
    });
    
    return () => socket.disconnect();
  }, [slug]);

  if (!event || !theme) return <LoadingSpinner />;

  return (
    <ThemeProvider initialTheme={theme}>
      <div className="min-h-screen relative overflow-hidden">
        {/* ⭐ Ambient Animations (Background) */}
        <AmbientAnimation />
        
        {/* ⭐ Live-Wall mit Theme-Farben */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, var(--theme-gradient-start), var(--theme-gradient-end))`
          }}
        />
        
        {/* Event-Header mit Theme */}
        <div className="relative z-10 p-8 text-center">
          <h1 
            className="text-6xl font-bold mb-4"
            style={{
              fontFamily: 'var(--theme-font-heading)',
              color: 'var(--theme-text-primary)'
            }}
          >
            {event.title}
          </h1>
        </div>
        
        {/* ⭐ Photo-Grid mit Theme-Animationen */}
        <div className="relative z-10 p-8">
          <ThemeAnimation animationType="entrance">
            <div className="grid grid-cols-4 gap-4">
              {photos.map(photo => (
                <div 
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden"
                  style={{
                    border: `4px solid var(--theme-primary)`,
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <img 
                    src={photo.url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </ThemeAnimation>
        </div>
      </div>
    </ThemeProvider>
  );
}
```

**Datei**: `packages/frontend/src/app/live/[slug]/mosaic/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ThemeProvider } from '@/providers/ThemeProvider';
import Masonry from 'react-masonry-css';

export default function MosaicWallPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [event, setEvent] = useState<any>(null);
  const [theme, setTheme] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    // Load event with theme
    fetch(`/api/events?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        setEvent(data);
        
        if (data.themeId) {
          fetch(`/api/themes/${data.themeId}`)
            .then(res => res.json())
            .then(setTheme);
        }
      });
    
    // Realtime updates
    const socket = io();
    socket.on('mosaic-update', (mosaicPhotos) => {
      setPhotos(mosaicPhotos);
    });
    
    return () => socket.disconnect();
  }, [slug]);

  if (!event || !theme) return <LoadingSpinner />;

  // ⭐ Verwende Theme-wallLayout
  const layoutType = theme.wallLayout || 'masonry'; // "masonry" | "grid" | "carousel"

  return (
    <ThemeProvider initialTheme={theme}>
      <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--theme-background)' }}>
        {layoutType === 'masonry' && (
          <Masonry
            breakpointCols={{ default: 6, 1536: 5, 1280: 4, 1024: 3, 768: 2 }}
            className="flex gap-4"
            columnClassName="flex flex-col gap-4"
          >
            {photos.map(photo => (
              <div 
                key={photo.id}
                className="rounded-lg overflow-hidden transition-transform hover:scale-105"
                style={{
                  border: `2px solid var(--theme-border)`,
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <img src={photo.url} alt="" className="w-full" />
              </div>
            ))}
          </Masonry>
        )}
        
        {layoutType === 'grid' && (
          <div className="grid grid-cols-6 gap-4">
            {photos.map(photo => (
              <div 
                key={photo.id}
                className="aspect-square rounded-lg overflow-hidden"
                style={{ border: `2px solid var(--theme-primary)` }}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        
        {layoutType === 'carousel' && (
          // Carousel-Implementation mit Theme-Farben
          <MosaicCarousel photos={photos} theme={theme} />
        )}
      </div>
    </ThemeProvider>
  );
}
```

---

## 📋 AKTUALISIERTE IMPLEMENTIERUNGS-TASKS

### Phase 1: Backend (ERWEITERT)

#### 1.1 Unified AI Cache Service
- [ ] **Datei erstellen**: `packages/backend/src/services/unifiedAiCacheService.ts`
- [ ] `UnifiedAiCacheService` Klasse implementieren
- [ ] Alle 6 Cache-Levels definieren
- [ ] `getCached()`, `setCached()`, `clearCache()`, `warmUp()` implementieren
- [ ] Stats-Tracking (Hits, Misses, Size pro Feature)
- [ ] Unit-Tests schreiben

#### 1.2 Bestehende AI-Services migrieren
- [ ] **aiService.ts**: Album-Vorschläge auf `unifiedAiCache` migrieren
- [ ] **aiService.ts**: Titel-Generierung auf `unifiedAiCache` migrieren
- [ ] **aiService.ts**: Hashtag-Generierung auf `unifiedAiCache` migrieren
- [ ] **aiThemeGenerator.ts**: Theme-Generierung auf `unifiedAiCache` migrieren
- [ ] Neue AI-Features (Photo-Analysis, Challenge-Suggestions) mit Cache implementieren

#### 1.3 Admin-Cache-Route anpassen
- [ ] **adminCache.ts**: "Cache leeren" muss AI-Cache ausschließen
- [ ] Optional: Separate Redis-Datenbanken (DB 0 vs DB 1)
- [ ] Tests schreiben (AI-Cache bleibt nach "Cache leeren" erhalten)

#### 1.4 AI-Cache-Stats-Endpoint
- [ ] **routes/aiCache.ts**: `GET /ai/cache/stats` erweitern für Feature-Breakdown
- [ ] `POST /ai/cache/warm-up` erweitern für Feature-Auswahl
- [ ] `DELETE /ai/cache/:feature` für feature-spezifisches Löschen

---

### Phase 2: Admin-Dashboard (ERWEITERT)

#### 2.1 AI-Cache-Page erweitern
- [ ] **system/ai-cache/page.tsx**: Feature-Auswahl für Warm-Up hinzufügen
- [ ] Stats nach Feature gruppiert anzeigen (Hit-Rate pro Feature)
- [ ] Feature-spezifisches Cache-Löschen (Dropdown)
- [ ] ⚠️ Warnung bei "Alles löschen" (Kosten-Hinweis: €500+)
- [ ] "Cache leeren" in Sidebar: Tooltip hinzufügen ("AI-Cache wird nicht gelöscht")

#### 2.2 Sidebar: Cache-Button-Tooltip
- [ ] **Sidebar.tsx**: Tooltip zu "Cache leeren" Button
- [ ] Text: "Löscht Session- & UI-Cache (AI-Cache bleibt geschützt)"

---

### Phase 3: Frontend - Event-Walls (NEU!)

#### 3.1 Live-Wall Theme-Integration
- [ ] **live/[slug]/wall/page.tsx**: Theme-Loading hinzufügen
- [ ] Wrap in `<ThemeProvider>`
- [ ] Ambient-Animationen (Background)
- [ ] Theme-Farben für Header & Gradient
- [ ] Photo-Grid mit Theme-Animationen
- [ ] Responsive-Breakpoints (Desktop/TV-Screen)

#### 3.2 Mosaic-Wall Theme-Integration
- [ ] **live/[slug]/mosaic/page.tsx**: Theme-Loading hinzufügen
- [ ] Wrap in `<ThemeProvider>`
- [ ] `theme.wallLayout` verwenden ("masonry" | "grid" | "carousel")
- [ ] Theme-Farben für Borders & Shadows
- [ ] Realtime-Updates mit Theme-Animationen

#### 3.3 Wall-Layout-Varianten
- [ ] **Masonry-Layout** (bestehend, Theme-Farben hinzufügen)
- [ ] **Grid-Layout** (neu implementieren mit Theme)
- [ ] **Carousel-Layout** (neu implementieren mit Theme)
- [ ] Performance-Tests für alle 3 Layouts

---

### Phase 4: Testing (ERWEITERT)

#### 4.1 AI-Cache-Tests
- [ ] Unit-Tests: Hierarchical Fallback funktioniert
- [ ] Unit-Tests: Feature-spezifisches Caching
- [ ] Integration-Tests: Warm-Up für alle Features
- [ ] Integration-Tests: "Cache leeren" schützt AI-Cache
- [ ] Load-Tests: 1000 concurrent AI-Calls (Cache-Hit-Rate >80%)

#### 4.2 Event-Wall-Tests
- [ ] E2E-Test: Live-Wall lädt Theme korrekt
- [ ] E2E-Test: Mosaic-Wall verwendet `wallLayout`
- [ ] Visual-Regression: Alle 3 Wall-Layouts mit 3 Themes
- [ ] Performance: 60 FPS auch mit 100+ Fotos

---

## ⚠️ RISIKEN & MITIGATION

### Neue Risiken

| Risiko | Wahrsch. | Impact | Mitigation |
|--------|----------|--------|------------|
| 🔴 Versehentliches Löschen des AI-Cache | Mittel | Kritisch | UI-Warnung, Bestätigung, Feature-spezifisches Löschen |
| 🟡 Migration bestehender AI-Services | Niedrig | Mittel | Schrittweise Migration, Feature-Flags |
| 🟡 Event-Walls Performance-Probleme | Mittel | Hoch | Lazy-Loading, Animation-Throttling |
| 🟢 Redis DB-Separation | Niedrig | Niedrig | Opt-in, Fallback auf Filter-basierte Lösung |

---

## 📊 ERFOLGS-METRIKEN (ERWEITERT)

### AI-Cache-Metriken

| Metrik | Baseline | Ziel (3 Monate) |
|--------|----------|-----------------|
| **Cache-Hit-Rate (Theme-Gen)** | 0% | >85% |
| **Cache-Hit-Rate (Album-Sug)** | ~30% | >90% |
| **Cache-Hit-Rate (Titel-Gen)** | ~30% | >90% |
| **AI-Kosten pro Event** | €2-5 | <€0.50 |
| **AI-Kosten gesamt** | €500/Monat | <€100/Monat |
| **Cache-Größe (Redis)** | 1GB | 5-10GB |
| **Warm-Up-Erfolgsrate** | - | >95% |

### Event-Wall-Metriken

| Metrik | Baseline | Ziel |
|--------|----------|------|
| **Walls mit Theme** | 0% | >90% |
| **Wall-Layout-Varianten** | 1 (Masonry) | 3 (Masonry, Grid, Carousel) |
| **Wall-Performance (FPS)** | 45 FPS | >55 FPS |
| **Theme-konsistente Walls** | 0% | 100% |

---

## 🚨 KRITISCHE PUNKTE FÜR OPUS

### MUST-DO vor Implementierung:

1. ✅ **Unified AI Cache Service** erstellen (ZUERST!)
2. ✅ **"Cache leeren" Button** anpassen (AI-Cache schützen)
3. ✅ **AI-Cache-Page** erweitern (Feature-Breakdown, Warm-Up)
4. ✅ **Event-Walls** (Live, Mosaic) mit Theme-Integration

### NICE-TO-HAVE (später):

- Redis DB-Separation (Performance-Optimierung)
- Automatischer Warm-Up-Scheduler (Cron-Job)
- Cache-Preloading bei Event-Erstellung
- Cache-Analytics-Dashboard (Grafana)

---

## 📚 ZUSÄTZLICHE DOKUMENTATION

### Neue Dateien zu erstellen:

1. `packages/backend/src/services/unifiedAiCacheService.ts` (Kern-Service)
2. `claude/AI-CACHE-STRATEGY.md` (Detaillierte Caching-Strategie)
3. `claude/EVENT-WALL-THEME-GUIDE.md` (Integration-Guide für Walls)

---

**DOKUMENT-STATUS**: ✅ **KRITISCH - SOFORT UMSETZEN**  
**ERSTELLT**: 2026-02-16  
**PRIORITÄT**: 🔥🔥🔥 **HÖCHSTE PRIORITÄT**

---

> **💡 TIP für OPUS**: Beginne mit `unifiedAiCacheService.ts` → Dann `adminCache.ts` anpassen → Dann AI-Cache-Page erweitern → Dann Event-Walls integrieren. In dieser Reihenfolge!

> **⚠️ WARNUNG**: NIEMALS den AI-Cache ohne explizite User-Bestätigung löschen. Kosten: €500+ zum Regenerieren!
