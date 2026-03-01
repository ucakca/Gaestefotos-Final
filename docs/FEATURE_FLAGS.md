# Feature Flags System

## 📋 Übersicht

Das Feature Flags System ermöglicht die **flexible Steuerung von Funktionen** basierend auf Package-Tiers (FREE, BASIC, PREMIUM). Admins können über das Admin Dashboard Feature Flags für verschiedene Packages verwalten.

---

## 🎯 Verfügbare Feature Flags

### **1. Video Upload** 🎥
- **Flag:** `allowVideoUpload`
- **Beschreibung:** Erlaubt Gästen das Hochladen von Videos zu Events
- **Use Case:** Premium-Events mit Video-Memories

### **2. Stories** 📖
- **Flag:** `allowStories`
- **Beschreibung:** Aktiviert Story-Feature (Instagram-Style temporäre Posts)
- **Use Case:** Live-Events mit zeitlich begrenzten Inhalten

### **3. Password Protect** 🔒
- **Flag:** `allowPasswordProtect`
- **Beschreibung:** Event kann mit Passwort geschützt werden
- **Use Case:** Private Events mit zusätzlicher Sicherheitsebene

### **4. Guestbook** 📝
- **Flag:** `allowGuestbook`
- **Beschreibung:** Digitales Gästebuch mit Text-Einträgen
- **Use Case:** Hochzeiten, Geburtstage - Gäste hinterlassen Nachrichten

### **5. Zip Download** 📦
- **Flag:** `allowZipDownload`
- **Beschreibung:** Massendownload aller Event-Fotos als ZIP
- **Use Case:** Gastgeber möchte alle Fotos auf einmal herunterladen

### **6. Bulk Operations** ⚡
- **Flag:** `allowBulkOperations`
- **Beschreibung:** Massenaktionen (Löschen, Verschieben, Kategorisieren)
- **Use Case:** Events mit vielen Fotos - effiziente Verwaltung

### **7. Live Wall** 📺
- **Flag:** `allowLiveWall`
- **Beschreibung:** Live-Anzeige hochgeladener Fotos (Beamer/TV)
- **Use Case:** Event mit großem Bildschirm - Live Photo Stream

### **8. Face Search** 🔍
- **Flag:** `allowFaceSearch`
- **Beschreibung:** KI-basierte Gesichtserkennung zum Finden eigener Fotos
- **Use Case:** Große Events - Gäste finden Fotos von sich selbst

### **9. Guestlist** 👥
- **Flag:** `allowGuestlist`
- **Beschreibung:** Gästelisten-Management mit RSVP
- **Use Case:** Events mit Einladungsmanagement

### **10. Full Invitation** 💌
- **Flag:** `allowFullInvitation`
- **Beschreibung:** Vollständige digitale Einladungen (Design, Versand, RSVP)
- **Use Case:** Hochzeiten mit komplettem Einladungs-Workflow

### **11. Co-Hosts** 🤝
- **Flag:** `allowCoHosts`
- **Beschreibung:** Mehrere Event-Veranstalter mit Admin-Rechten
- **Use Case:** Gemeinsam organisierte Events

### **12. Ad Free** 🚫
- **Flag:** `isAdFree`
- **Beschreibung:** Werbefrei (keine Ads, kein Branding)
- **Use Case:** Premium-Experience ohne Ablenkungen

---

## 🛠️ Admin Dashboard

### **Zugriff**
```
URL: /admin/feature-flags
Berechtigung: ADMIN only
```

### **Funktionen**

#### **Package Overview**
- Grid-Ansicht aller Packages
- Status-Indicator (Active/Inactive)
- Preis- und Tier-Anzeige
- Storage Limits Anzeige

#### **Feature Toggle**
- Click-to-Toggle für jedes Feature
- Sofortige Speicherung (Auto-Save)
- Visuelles Feedback (Farben, Icons)
- Loading States während Update

#### **Package Activation**
- Toggle-Button für Package Active/Inactive
- Deaktivierte Packages sind für Nutzer nicht verfügbar

---

## 🔧 Backend API

### **Endpoints**

#### **GET /api/admin/feature-flags**
Liste aller Package Definitions mit Feature Flags
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8001/api/admin/feature-flags
```

**Response:**
```json
{
  "packages": [
    {
      "id": "pkg_123",
      "name": "Premium Package",
      "sku": "PREMIUM_2024",
      "type": "BASE",
      "resultingTier": "PREMIUM",
      "isActive": true,
      "allowVideoUpload": true,
      "allowStories": true,
      "allowPasswordProtect": true,
      "allowGuestbook": true,
      "allowZipDownload": true,
      "allowBulkOperations": true,
      "allowLiveWall": true,
      "allowFaceSearch": true,
      "allowGuestlist": true,
      "allowFullInvitation": true,
      "allowCoHosts": true,
      "isAdFree": true,
      "priceEurCents": 4999,
      "storageLimitPhotos": 10000,
      "storageLimitBytes": 10737418240,
      "displayOrder": 2
    }
  ]
}
```

#### **GET /api/admin/feature-flags/:id**
Einzelne Package Definition
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8001/api/admin/feature-flags/pkg_123
```

#### **PUT /api/admin/feature-flags/:id**
Update Feature Flags für Package
```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"allowVideoUpload": false}' \
  http://localhost:8001/api/admin/feature-flags/pkg_123
```

#### **POST /api/admin/feature-flags**
Create new Package Definition
```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Basic Package",
    "sku": "BASIC_2024",
    "resultingTier": "BASIC",
    "allowGuestbook": true,
    "allowZipDownload": true
  }' \
  http://localhost:8001/api/admin/feature-flags
```

#### **DELETE /api/admin/feature-flags/:id**
Delete Package Definition
```bash
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8001/api/admin/feature-flags/pkg_123
```

---

## 💾 Database Schema

### **PackageDefinition Model**
```prisma
model PackageDefinition {
  id                   String                @id @default(uuid())
  sku                  String                @unique
  name                 String
  type                 PackageDefinitionType @default(BASE)
  resultingTier        String
  upgradeFromTier      String?
  storageLimitBytes    BigInt?
  isActive             Boolean               @default(true)
  
  // Feature Flags
  allowBulkOperations  Boolean               @default(false)
  allowCoHosts         Boolean               @default(false)
  allowFaceSearch      Boolean               @default(false)
  allowFullInvitation  Boolean               @default(false)
  allowGuestbook       Boolean               @default(false)
  allowGuestlist       Boolean               @default(false)
  allowLiveWall        Boolean               @default(false)
  allowPasswordProtect Boolean               @default(false)
  allowStories         Boolean               @default(false)
  allowVideoUpload     Boolean               @default(false)
  allowZipDownload     Boolean               @default(false)
  isAdFree             Boolean               @default(false)
  
  // Limits
  storageLimitPhotos   Int?
  maxCategories        Int?
  maxChallenges        Int?
  maxCoHosts           Int?
  maxZipDownloadPhotos Int?
  
  // Meta
  priceEurCents        Int?
  description          String?
  displayOrder         Int                   @default(0)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  
  @@map("package_definitions")
}
```

---

## 🎨 Frontend Implementation

### **Component Location**
```
packages/frontend/src/app/admin/feature-flags/page.tsx
```

### **Features**
- ✅ Grid Layout (Responsive: 1/2/3 Spalten)
- ✅ Feature Toggle Buttons mit Icons
- ✅ Active/Inactive Package Toggle
- ✅ Loading States
- ✅ Error Handling mit Toast
- ✅ Auto-Save (kein Submit-Button nötig)
- ✅ Storage Info Display

### **State Management**
```typescript
const [packages, setPackages] = useState<PackageDefinition[]>([]);
const [saving, setSaving] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
```

### **Key Functions**
```typescript
// Toggle einzelnes Feature
const toggleFeature = async (packageId: string, featureKey: string, currentValue: boolean) => {
  const updated = { ...pkg, [featureKey]: !currentValue };
  await api.put(`/admin/feature-flags/${packageId}`, updated);
  setPackages(prev => prev.map(p => p.id === packageId ? updated : p));
};

// Toggle Package Active Status
const togglePackageActive = async (packageId: string, currentActive: boolean) => {
  const updated = { ...pkg, isActive: !currentActive };
  await api.put(`/admin/feature-flags/${packageId}`, updated);
};
```

---

## 🔐 Authorization

**Alle Endpoints benötigen:**
- Valid JWT Token
- User Role: `ADMIN`

**Middleware Chain:**
```typescript
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // ...
});
```

---

## 📊 Use Cases

### **Scenario 1: Basic → Premium Upgrade**
```typescript
// User kauft Premium Package
// EventEntitlement wird erstellt mit resultingTier: "PREMIUM"
// Event hat jetzt Zugriff auf alle Premium Features:
event.entitlement.package.allowFaceSearch // true
event.entitlement.package.allowVideoUpload // true
event.entitlement.package.isAdFree // true
```

### **Scenario 2: Feature einschränken**
```typescript
// Admin deaktiviert Face Search für Basic Package
await api.put('/admin/feature-flags/basic_pkg_id', {
  allowFaceSearch: false
});

// Basic Events verlieren sofort Zugriff auf Face Search
// UI passt sich automatisch an (Button disabled/hidden)
```

### **Scenario 3: Neues Feature rollout**
```typescript
// 1. Admin erstellt neues Flag in Schema
// 2. Admin aktiviert Feature nur für Premium
// 3. Schrittweise Rollout zu anderen Tiers
// 4. Beta-Testing mit ausgewählten Packages
```

---

## 🚀 Deployment

### **Migration**
```bash
cd packages/backend
npx prisma migrate dev --name add_feature_flags
npx prisma generate
```

### **Backend Deploy**
```bash
systemctl stop gaestefotos-backend
cd packages/backend && pnpm build
systemctl start gaestefotos-backend
```

### **Frontend Deploy**
```bash
systemctl stop gaestefotos-frontend
cd packages/frontend && pnpm build:prod
systemctl start gaestefotos-frontend
```

---

## 📝 Beispiel-Packages

### **FREE Package**
```json
{
  "name": "Free",
  "sku": "FREE_2024",
  "resultingTier": "FREE",
  "storageLimitPhotos": 100,
  "allowGuestbook": false,
  "allowZipDownload": false,
  "allowVideoUpload": false,
  "isAdFree": false
}
```

### **BASIC Package**
```json
{
  "name": "Basic",
  "sku": "BASIC_2024",
  "resultingTier": "BASIC",
  "storageLimitPhotos": 1000,
  "priceEurCents": 1999,
  "allowGuestbook": true,
  "allowZipDownload": true,
  "allowPasswordProtect": true,
  "isAdFree": false
}
```

### **PREMIUM Package**
```json
{
  "name": "Premium",
  "sku": "PREMIUM_2024",
  "resultingTier": "PREMIUM",
  "storageLimitPhotos": 10000,
  "priceEurCents": 4999,
  "allowVideoUpload": true,
  "allowStories": true,
  "allowFaceSearch": true,
  "allowLiveWall": true,
  "allowBulkOperations": true,
  "allowCoHosts": true,
  "isAdFree": true
}
```

---

## 🎓 Laiensichere Erklärung

**Was sind Feature Flags?**
Feature Flags sind wie "Schalter" für Funktionen in der App. Der Admin kann diese Schalter ein- oder ausschalten, um zu steuern, welche Features in welchen Paketen verfügbar sind.

**Warum brauchen wir das?**
- **Flexibilität:** Neue Features können stufenweise eingeführt werden
- **Monetarisierung:** Premium-Features nur für zahlende Kunden
- **Testing:** Features erst für ausgewählte Nutzer aktivieren
- **Kontrolle:** Problematische Features schnell deaktivieren

**Wie funktioniert es?**
1. User bucht ein Package (z.B. "Premium")
2. Package hat Feature Flags gesetzt (z.B. `allowVideoUpload: true`)
3. App prüft vor Feature-Nutzung: "Hat User Zugriff?"
4. Wenn ja: Feature anzeigen, wenn nein: Button disabled/hidden

**Beispiel:**
```
User A hat "Basic Package" → kann Gästebuch nutzen
User B hat "Free Package" → sieht Gästebuch nicht
Admin schaltet Gästebuch für "Free" an → User B sieht es jetzt auch
```

---

## 🔍 Testing

### **Manual Testing**
1. Als Admin einloggen
2. Zu `/admin/feature-flags` navigieren
3. Feature togglen
4. Als Host Event erstellen
5. Prüfen ob Feature verfügbar/nicht verfügbar ist

### **API Testing**
```bash
# Get all packages
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8001/api/admin/feature-flags

# Toggle feature
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"allowVideoUpload": true}' \
  http://localhost:8001/api/admin/feature-flags/$PACKAGE_ID
```

---

**Status:** ✅ PRODUCTION READY
**Version:** 1.0.0
**Last Updated:** 2026-01-22
