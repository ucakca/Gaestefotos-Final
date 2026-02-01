# Technical Debt Backlog

**Last Updated:** 17. Januar 2026

---

## 🔴 Priority 1: Critical (Security/Stability)

### 1.1 Silent Error Swallowing
**Files:** 22+ (siehe CODE_QUALITY_AUDIT.md)  
**Effort:** 2-3 Tage  
**Risk:** Hoch - Fehler unbemerkt, Debugging unmöglich

**Action Items:**
- [ ] `apiKeyAuth.ts` - DB-Updates mit Logger
- [ ] `woocommerceWebhooks.ts` - Webhook-Processing mit Error-Tracking
- [ ] `uploads.ts` - File-Cleanup mit Logger
- [ ] Frontend `api.ts` - Network-Errors tracken

---

## 🟡 Priority 2: High (Performance/Maintainability)

### 2.1 Console Logging in Production
**Files:** 16+  
**Effort:** 1 Tag  
**Risk:** Mittel - Performance, potenzielle Leaks

**Action Items:**
- [ ] Backend: `uploads.ts`, `imageProcessor.ts`, `index.ts`
- [ ] Frontend: `tusUpload.ts`, `uploadMetrics.ts`, `UploadButton.tsx`
- [ ] Replace with `logger.info/error/warn`

### 2.2 Type Safety - `any` Hot Spots
**Files:** Top 10 Dateien (~250 any's)  
**Effort:** 3-5 Tage  
**Risk:** Mittel - Wartbarkeit

**Action Items:**
- [ ] `events.ts` (53 any's) - Prisma Types nutzen
- [ ] `guestbook.ts` (43 any's)
- [ ] `ModernPhotoGrid.tsx` (40 any's)

---

## 🟢 Priority 3: Medium (Features)

### 3.1 Co-Host Email Implementation
**Location:** `events.ts:1153`  
**Effort:** 1 Tag  
**Risk:** Niedrig - Feature-Gap

**Action Items:**
- [ ] Email-Template erstellen
- [ ] Invitation-Link generieren
- [ ] Email-Service integrieren
- [ ] Tests schreiben

### 3.2 Code Organization
**Files:** `events.ts` (1200 LOC), `photos.ts` (800 LOC)  
**Effort:** 2-3 Tage  
**Risk:** Niedrig - Wartbarkeit

**Action Items:**
- [ ] Route-Handler in Services auslagern
- [ ] Shared Logic modularisieren
- [ ] Feature-basierte Struktur evaluieren

---

## 📊 Metrics & Tracking

### Baseline (17.01.2026)
```
Silent Catches:     22 files
Console Logging:    16 files
Type Safety (any):  440 occurrences
Large Files (>800): 2 files
Missing Features:   1 (Co-Host Email)
```

### Target Q2 2026
```
Silent Catches:     <5 files (kritische Pfade: 0)
Console Logging:    0 files (nur logger.*)
Type Safety (any):  <200 occurrences (-55%)
Large Files (>800): 0 files
Missing Features:   0
```

---

## 🛠️ Refactoring Guidelines

### Error Handling
```typescript
// ❌ Falsch
.catch(() => undefined)

// ✅ Richtig
.catch((error) => {
  logger.error('Operation failed', { 
    error: error.message,
    stack: error.stack,
    context: { userId, eventId }
  });
  return undefined; // oder throw, je nach Use-Case
})
```

### Logging
```typescript
// ❌ Falsch
console.log('Processing:', data);

// ✅ Richtig
logger.info('Processing started', { 
  operation: 'processData',
  dataSize: data.length 
});
```

### Type Safety
```typescript
// ❌ Falsch
const event: any = await prisma.event.findUnique(...);

// ✅ Richtig
import type { Event } from '@prisma/client';
const event: Event | null = await prisma.event.findUnique(...);
```

---

## 📅 Sprint Planning

### Sprint 1 (KW 3-4) ✅ ERLEDIGT
- [x] Silent Error Swallowing: Kritische Pfade (apiKeyAuth, uploads) ✅
- [x] Console Logging: Backend kritische Pfade ✅
- [x] Console Logging: Frontend Upload-Flow ✅

### Sprint 2 (KW 5-6) - AKTUELL
- [ ] Co-Host Email Implementation (1 Tag) ⭐ PRIO 1
- [ ] Silent Error Swallowing: Webhooks verbleibend
- [ ] Console Logging: Verbleibende ~33 Vorkommen
- [ ] Design System Audit: Farb-Entscheidung treffen

### Sprint 3 (KW 7-10)
- [ ] Design System Migration: Admin-Dashboard (6-9 Tage)
- [ ] Type Safety: events.ts, guestbook.ts (Top 3 Dateien)

### Sprint 4 (KW 11-14)
- [ ] Type Safety: Frontend Hot Spots
- [ ] Code Organization: Refactoring großer Dateien
- [ ] Doppelklick-Schutz: Optional Shared Hook

---

## ✅ Completed

*Noch keine Items*

---

**Owner:** Development Team  
**Review Cadence:** Monatlich  
**Next Review:** 17. Februar 2026
