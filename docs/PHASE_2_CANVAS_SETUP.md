# Phase 2: Canvas-Foundation (Konva.js)

**Zeitrahmen:** KW 7-8 (7-10 Tage)  
**Ziel:** Einladungskarten-Editor MVP

---

## 📋 Voraussetzungen

- [x] Phase 1 abgeschlossen (QR-System produktionsreif)
- [ ] Konva.js Dependencies installiert
- [ ] Canvas-Editor Komponenten-Struktur geplant

---

## 🎯 Haupt-Features

### 1. Konva.js Setup

**Dependencies:**
```bash
pnpm add konva react-konva
pnpm add -D @types/konva
```

**Basis-Komponente:**
```typescript
// InvitationEditor.tsx
import { Stage, Layer, Text, Image, Rect } from 'react-konva';

const InvitationEditor = ({ eventId }: { eventId: string }) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Auto-Save Pattern (aus qr-styler übernehmen)
  const debouncedSave = useMemo(
    () => debounce((config) => api.put(`/events/${eventId}/invitation`, config), 1000),
    [eventId]
  );
  
  return (
    <Stage width={800} height={1200}>
      <Layer>
        {elements.map(el => renderElement(el, selectedId, setSelectedId))}
      </Layer>
    </Stage>
  );
};
```

---

### 2. Text-Editing (Drag, Resize, Rotate)

**Features:**
- [ ] Text hinzufügen via Toolbar
- [ ] Drag-and-Drop
- [ ] Resize mit Transformer
- [ ] Rotation
- [ ] Font/Size/Color ändern

**Implementierung:**
```typescript
import { Text, Transformer } from 'react-konva';

const EditableText = ({ element, isSelected, onSelect, onChange }) => {
  const textRef = useRef();
  const transformerRef = useRef();
  
  useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  
  return (
    <>
      <Text
        ref={textRef}
        text={element.text}
        x={element.x}
        y={element.y}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fill={element.color}
        draggable
        onClick={onSelect}
        onDragEnd={(e) => onChange({ ...element, x: e.target.x(), y: e.target.y() })}
      />
      {isSelected && <Transformer ref={transformerRef} />}
    </>
  );
};
```

---

### 3. Image-Upload (Drag-to-Position)

**Features:**
- [ ] Bild hochladen (Drag & Drop oder File Input)
- [ ] Auf Canvas positionieren
- [ ] Resize/Rotate
- [ ] DPI-Warnung bei < 150 DPI

**Implementierung:**
```typescript
const ImageUpload = ({ onImageAdd }) => {
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    
    if (!file.type.startsWith('image/')) {
      alert('Bitte nur Bilder hochladen');
      return;
    }
    
    const img = new window.Image();
    img.onload = () => {
      // DPI Check
      const dpi = calculateDPI(img, file);
      if (dpi < 150) {
        alert(`Warnung: Bild hat nur ${dpi} DPI. Empfohlen: 150+ DPI für Druck.`);
      }
      
      onImageAdd({
        id: crypto.randomUUID(),
        type: 'image',
        src: img.src,
        x: 100,
        y: 100,
        width: img.width,
        height: img.height,
      });
    };
    img.src = URL.createObjectURL(file);
  };
  
  return <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>...</div>;
};
```

---

### 4. Basic Toolbar

**Komponenten:**
- [ ] Add Text Button
- [ ] Upload Image Button
- [ ] Font Selector (aus QR-Designer wiederverwenden)
- [ ] Font-Size Slider
- [ ] Color Picker
- [ ] Delete Button
- [ ] Layer Order (Bring to Front/Send to Back)

**Layout:**
```typescript
const Toolbar = ({ onAddText, onAddImage, selectedElement, onUpdateElement }) => {
  return (
    <div className="flex gap-2 p-4 border-b">
      <Button onClick={onAddText}>
        <Type size={16} className="mr-2" />
        Text hinzufügen
      </Button>
      
      <Button onClick={onAddImage}>
        <Image size={16} className="mr-2" />
        Bild hochladen
      </Button>
      
      {selectedElement && (
        <>
          <FontSelector 
            value={selectedElement.fontFamily} 
            onChange={(font) => onUpdateElement({ ...selectedElement, fontFamily: font })}
          />
          
          <Button onClick={() => onDeleteElement(selectedElement.id)} variant="destructive">
            <Trash2 size={16} />
          </Button>
        </>
      )}
    </div>
  );
};
```

---

### 5. Export via bestehende Routes

**Integration:**
```typescript
const exportInvitation = async (eventId: string, elements: CanvasElement[]) => {
  // 1. Konva Stage zu SVG/PNG konvertieren
  const stage = stageRef.current;
  const dataURL = stage.toDataURL({ pixelRatio: 3 }); // 3x für HD
  
  // 2. Backend-Route nutzen (analog QR-Export)
  const response = await fetch(`/api/events/${eventId}/invitation/export.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      format: 'A5',
      image: dataURL, // Base64 PNG
      elements, // JSON für späteres Re-Editing
    }),
  });
  
  const blob = await response.blob();
  downloadBlob(blob, `einladung-${eventId}.pdf`);
};
```

---

## 🗂️ Datenmodell

**InvitationConfig Interface:**
```typescript
export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  
  // Image-specific
  src?: string;
  
  // Shape-specific
  shapeType?: 'rect' | 'circle';
  fill?: string;
  stroke?: string;
}

export interface InvitationConfig {
  id: string;
  eventId: string;
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  format: 'A6' | 'A5' | 'A4' | 'square';
  createdAt: string;
  updatedAt: string;
}
```

**Backend Schema (Prisma):**
```prisma
model InvitationConfig {
  id        String   @id @default(uuid())
  eventId   String   @unique
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  elements  Json     // CanvasElement[]
  format    String   @default("A5")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 📂 Datei-Struktur

```
packages/frontend/src/
├─ components/invitation-editor/
│  ├─ InvitationEditor.tsx          (Haupt-Komponente)
│  ├─ CanvasStage.tsx               (Konva Stage Wrapper)
│  ├─ EditableText.tsx              (Text mit Transformer)
│  ├─ EditableImage.tsx             (Image mit Transformer)
│  ├─ Toolbar.tsx                   (Add/Edit Controls)
│  ├─ LayerPanel.tsx                (Layer-Liste + Reorder)
│  └─ ExportButton.tsx              (PDF/PNG Download)
│
├─ app/events/[id]/invitation-editor/
│  └─ page.tsx                      (Route für Editor)
│
└─ lib/
   ├─ canvasUtils.ts                (DPI-Check, Export-Helpers)
   └─ invitationStorage.ts          (Auto-Save Logic)
```

---

## ✅ Definition of Done

- [ ] Konva.js installiert und Stage rendert
- [ ] Text hinzufügen, editieren, verschieben funktioniert
- [ ] Bild hochladen und positionieren funktioniert
- [ ] Basic Toolbar mit Font/Size/Color funktioniert
- [ ] Auto-Save nach 1s Debounce
- [ ] Export als PNG (300 DPI) funktioniert
- [ ] Export als PDF über Backend-Route funktioniert

---

## 🧪 Testing

**Manuelle Tests:**
1. Text hinzufügen → Drag → Resize → Text ändert sich ✅
2. Bild hochladen → Positionieren → Rotation ✅
3. Tab schließen → Wieder öffnen → Design geladen ✅
4. Export PNG → Datei ist 300 DPI ✅
5. Export PDF → Datei druckfertig ✅

**E2E Tests (optional):**
```typescript
test('Invitation Editor: Add Text', async ({ page }) => {
  await page.goto('/events/test-event-id/invitation-editor');
  await page.click('button:has-text("Text hinzufügen")');
  await page.fill('input[name="text"]', 'Herzliche Einladung');
  // ... weitere Assertions
});
```

---

**Status:** 📋 Ready for Implementation  
**Blocker:** Keine - kann sofort gestartet werden  
**Next:** Nach Phase 2 → Phase 3 (Advanced Features)
