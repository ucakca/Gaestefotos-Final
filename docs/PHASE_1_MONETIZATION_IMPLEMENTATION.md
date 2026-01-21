# 💰 Phase 1: Upgrade-Prompts & Monetarisierung

**Implementiert**: 2026-01-21  
**Dauer**: 2.5h  
**Status**: ✅ Abgeschlossen

---

## 🎯 ZIEL

Zero In-App Monetarisierung aktivieren durch attraktive Upgrade-Prompts, Limit-Counter und Feature-Gates.

---

## 📦 IMPLEMENTIERTE KOMPONENTEN

### 1. UsageLimitCounter
**Datei**: `/packages/frontend/src/components/monetization/UsageLimitCounter.tsx`

**Features**:
- Visueller Progress-Bar für Limits
- Farbcodierung: Grün → Gelb (80%) → Rot (100%)
- Compact & Full-Mode
- Upgrade-CTA bei Limit-Erreichen
- Animation mit Framer Motion

**Props**:
```typescript
{
  packageInfo: PackageInfo | null;
  currentUsage: number;
  limitKey: 'storageLimitPhotos' | 'maxCategories' | 'maxChallenges' | 'maxCoHosts';
  label: string;
  onUpgrade?: () => void;
  compact?: boolean;
}
```

**Usage**:
```tsx
<UsageLimitCounter
  packageInfo={packageInfo}
  currentUsage={photoStats.total}
  limitKey="storageLimitPhotos"
  label="Foto-Speicher"
  onUpgrade={() => openUpgradeModal()}
/>
```

---

### 2. ProBadge
**Datei**: `/packages/frontend/src/components/monetization/ProBadge.tsx`

**Features**:
- 4 Varianten: `crown`, `sparkles`, `zap`, `lock`
- 3 Größen: `sm`, `md`, `lg`
- Gradient-Hintergrund (Amber → Orange)
- Optional animiert (Framer Motion)
- Klickbar für Upgrade-Action

**Props**:
```typescript
{
  size?: 'sm' | 'md' | 'lg';
  variant?: 'crown' | 'sparkles' | 'zap' | 'lock';
  label?: string;
  animated?: boolean;
  onClick?: () => void;
}
```

**Usage**:
```tsx
<ProBadge size="lg" variant="crown" animated />
```

---

### 3. UpgradeModal
**Datei**: `/packages/frontend/src/components/monetization/UpgradeModal.tsx`

**Features**:
- 3 Pricing-Tiers: Free, Starter, Pro
- Feature-Vergleich mit Checkmarks
- Highlight-Tier (Starter als "Beliebteste Wahl")
- Responsive Grid-Layout
- Animierte Backdrop & Modal (Framer Motion)
- Context-aware: Zeigt Feature an, das Upgrade triggered hat

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  triggerFeature?: FeatureKey;
  onSelectTier?: (tier: string) => void;
}
```

**Pricing**:
- **Free**: 0€, 50 Fotos, 1 Album
- **Starter**: 19€, 500 Fotos, Videos, Gästebuch, QR-Designer
- **Pro**: 49€, Unbegrenzt, Co-Hosts, Live-Wall, Gesichtserkennung

---

### 4. TrialBanner
**Datei**: `/packages/frontend/src/components/monetization/TrialBanner.tsx`

**Features**:
- 3 Varianten: `trial`, `upgrade`, `expiring`
- Gradient-Hintergründe (Lila, Amber, Rot)
- Dismissible (optional)
- Countdown-Anzeige für Trial-Ablauf
- CTA-Button integriert

**Props**:
```typescript
{
  variant?: 'trial' | 'upgrade' | 'expiring';
  daysLeft?: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
}
```

**Usage**:
```tsx
<TrialBanner
  variant="upgrade"
  onUpgrade={() => openUpgradeModal()}
  dismissible
/>
```

---

### 5. useUpgradeModal Hook
**Datei**: `/packages/frontend/src/hooks/useUpgradeModal.ts`

**Features**:
- State-Management für Modal
- Feature-Tracking (welches Feature triggered Upgrade)
- Tier-Selection-Handler
- Auto-Redirect zu Pricing/Checkout

**API**:
```typescript
{
  isOpen: boolean;
  triggerFeature?: FeatureKey;
  openUpgradeModal: (feature?: FeatureKey) => void;
  closeUpgradeModal: () => void;
  handleSelectTier: (tier: string) => void;
}
```

---

### 6. FeatureGate Enhanced
**Datei**: `/packages/frontend/src/components/ui/FeatureGate.tsx`

**Verbesserungen**:
- ProBadge statt Lock-Icon
- Gradient-Overlay (Blur-Effekt)
- Grayscale auf disabled Content
- Größere, prominentere CTAs
- Animierter Einstieg (Framer Motion)
- Feature-Beschreibung aus Katalog

**Vorher**:
- Einfaches Lock-Icon
- Kleiner Button
- Statisch

**Nachher**:
- ProBadge mit Crown
- Feature-Name + Beschreibung
- "Nicht in [Package] enthalten"
- Großer "Jetzt upgraden" Button
- Shadow + Hover-Effekte

---

## 🔗 INTEGRATION

### Dashboard-Integration
**Datei**: `/packages/frontend/src/app/events/[id]/dashboard/page.tsx`

**Änderungen**:
1. **Imports** hinzugefügt:
   ```typescript
   import { usePackageFeatures } from '@/hooks/usePackageFeatures';
   import { useUpgradeModal } from '@/hooks/useUpgradeModal';
   import { TrialBanner, UsageLimitCounter, UpgradeModal } from '@/components/monetization';
   ```

2. **State** initialisiert:
   ```typescript
   const packageFeatures = usePackageFeatures(eventId);
   const { isOpen, triggerFeature, openUpgradeModal, closeUpgradeModal, handleSelectTier } = useUpgradeModal();
   ```

3. **TrialBanner** für Free-User:
   ```tsx
   {packageFeatures.packageInfo?.isFree && (
     <TrialBanner variant="upgrade" onUpgrade={() => openUpgradeModal()} />
   )}
   ```

4. **UsageLimitCounter** für Paid-User:
   ```tsx
   {!packageFeatures.packageInfo?.isFree && (
     <UsageLimitCounter
       packageInfo={packageFeatures.packageInfo}
       currentUsage={photoStats.total}
       limitKey="storageLimitPhotos"
       label="Foto-Speicher"
       onUpgrade={() => openUpgradeModal()}
     />
   )}
   ```

5. **UpgradeModal** global:
   ```tsx
   <UpgradeModal
     isOpen={isOpen}
     onClose={closeUpgradeModal}
     currentTier={packageFeatures.packageInfo?.tier}
     triggerFeature={triggerFeature}
     onSelectTier={handleSelectTier}
   />
   ```

---

## 📊 UX-FLOW

### Free-User Journey:
1. **Dashboard-Load** → TrialBanner erscheint (Upgrade-Variant)
2. **Click "Jetzt upgraden"** → UpgradeModal öffnet
3. **Tier auswählen** → Redirect zu Pricing/Checkout
4. **Nach Upgrade** → Banner verschwindet, UsageLimitCounter erscheint

### Paid-User Journey:
1. **Dashboard-Load** → UsageLimitCounter zeigt Progress
2. **80% erreicht** → Counter wird gelb, Warnung
3. **100% erreicht** → Counter wird rot, "Limit erreicht", CTA
4. **Click "Jetzt upgraden"** → UpgradeModal öffnet
5. **Höheres Tier wählen** → Redirect zu Upgrade

### Feature-Lock Journey:
1. **Locked Feature anklicken** → FeatureGate-Overlay erscheint
2. **ProBadge + Feature-Info** sichtbar
3. **"Jetzt upgraden"** → UpgradeModal mit Feature-Kontext
4. **Tier auswählen** → Redirect mit Feature-Parameter

---

## 🎨 DESIGN-PRINZIPIEN

### Canva-Feeling:
- ✅ Gradient-Backgrounds (Lila, Amber, Orange)
- ✅ Smooth Animations (Framer Motion)
- ✅ Große, klare CTAs
- ✅ ProBadge als Premium-Signal
- ✅ Shadow & Hover-Effekte

### Psychologie:
- ✅ **Social Proof**: "Beliebteste Wahl" Badge
- ✅ **Urgency**: "Noch X Tage Trial"
- ✅ **Loss Aversion**: "Limit erreicht" rot
- ✅ **Progress**: Visual Progress-Bar
- ✅ **Clarity**: Feature-Beschreibungen
- ✅ **Simplicity**: 3 klare Tiers

---

## 📈 ERWARTETER IMPACT

### Metriken:
| Metrik | Vorher | Nachher (Prognose) |
|--------|--------|---------------------|
| **Upgrade-Awareness** | 0% (keine Prompts) | 80% |
| **Upgrade-Clicks** | 0 | +15% aller Free-User |
| **Conversion-Rate** | 0% | 2-5% |
| **ARPU** | €X | €X * 1.2-1.3 |

### Business-Impact:
- **Direkte Monetarisierung** aktiviert
- **Feature-Value** kommuniziert
- **Upgrade-Path** klar
- **Trial-to-Paid** Flow etabliert

---

## 🧪 TESTING

### Manuelle Tests:
```bash
# 1. Free-User Flow
- Dashboard öffnen als Free-User
- TrialBanner sollte erscheinen
- "Jetzt upgraden" klicken → Modal öffnet
- Tier auswählen → Redirect

# 2. Paid-User Flow
- Dashboard öffnen als Starter/Pro
- UsageLimitCounter sollte erscheinen
- Bei 50/50 Fotos → Counter rot, CTA sichtbar

# 3. Feature-Lock Flow
- Feature anklicken (z.B. Co-Hosts als Free)
- FeatureGate-Overlay mit ProBadge
- "Jetzt upgraden" → Modal mit Feature-Context
```

### Edge-Cases:
- ✅ Kein packageInfo → Graceful Fallback
- ✅ Unlimited Limits (null/-1) → Counter hidden
- ✅ Modal-Close → Feature-Context cleared
- ✅ Multiple Upgrades → State reset

---

## 📝 DOKUMENTATION FÜR ENTWICKLER

### Neue Feature hinzufügen:

1. **Feature-Key** in `usePackageFeatures.ts` registrieren:
   ```typescript
   export type FeatureKey = 
     | 'existingFeature'
     | 'newFeature'; // NEU

   export const FEATURE_DESCRIPTIONS: Record<FeatureKey, ...> = {
     newFeature: { name: 'Neues Feature', description: 'Beschreibung' },
   };
   ```

2. **FeatureGate** verwenden:
   ```tsx
   <FeatureGate
     feature="newFeature"
     isEnabled={isFeatureEnabled('newFeature')}
     packageName={packageName}
     onUpgrade={() => openUpgradeModal('newFeature')}
   >
     <NewFeatureComponent />
   </FeatureGate>
   ```

3. **Pricing-Modal** updaten (optional):
   ```typescript
   // In UpgradeModal.tsx
   features: [
     'Bestehendes Feature',
     'Neues Feature', // NEU
   ]
   ```

---

## 🚀 NÄCHSTE SCHRITTE

Phase 1 ist abgeschlossen. Nächste Phasen:

- **Phase 2**: Einladungsseiten-System (8-10h)
- **Phase 3**: Admin-Tools Enterprise (6-8h)
- **Phase 4**: UX-Polish & Animations (3-4h)
- **Phase 5**: Gästebuch-Feature (4-5h)

---

## 📚 WEITERE RESSOURCEN

- Master Strategic Plan: `/docs/MASTER_STRATEGIC_PLAN_2026.md`
- Package Features Hook: `/packages/frontend/src/hooks/usePackageFeatures.ts`
- Pricing-Logik: Backend `/packages/backend/src/routes/packageDefinitions.ts`
- Design-System: `/packages/frontend/tailwind.config.ts`

---

**Implementiert von**: Cascade AI  
**Review**: Pending  
**Status**: Production-Ready ✅
