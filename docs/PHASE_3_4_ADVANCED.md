# Phase 3 + 4: Advanced Features & Admin Tools

**Zeitrahmen:** KW 9-12+ (15-21 Tage)  
**Ziel:** Canva-ähnliches Feeling + Admin Batch-Tools

---

## Phase 3: Advanced Features (KW 9-11, 10-14 Tage)

### 🎯 Ziel
Professioneller Design-Editor mit allen Komfort-Features

---

### 1. Layer-Management (Z-Index)

**Features:**
- [ ] Layer-Panel mit Liste aller Elemente
- [ ] Drag-and-Drop zum Reordern
- [ ] "Bring to Front" / "Send to Back" Buttons
- [ ] Visibility Toggle (Show/Hide Layer)
- [ ] Lock Layer (prevent editing)

**Implementierung:**
```typescript
const LayerPanel = ({ elements, onReorder, onVisibilityToggle, onLockToggle }) => {
  return (
    <div className="w-64 border-l p-4">
      <h3 className="font-semibold mb-4">Ebenen</h3>
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={elements.map(e => e.id)}>
          {elements.map((element, index) => (
            <SortableLayerItem
              key={element.id}
              element={element}
              index={index}
              onVisibilityToggle={() => onVisibilityToggle(element.id)}
              onLockToggle={() => onLockToggle(element.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
```

---

### 2. Undo/Redo (10 Schritte)

**Features:**
- [ ] History Stack (max 10 Schritte)
- [ ] Undo (Strg+Z)
- [ ] Redo (Strg+Y / Strg+Shift+Z)
- [ ] UI Buttons für Undo/Redo

**Implementierung:**
```typescript
const useHistory = (initialState: CanvasElement[]) => {
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const pushHistory = (newState: CanvasElement[]) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 10) newHistory.shift(); // Max 10
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };
  
  const undo = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  
  const redo = () => {
    if (currentIndex < history.length - 1) setCurrentIndex(currentIndex + 1);
  };
  
  return {
    current: history[currentIndex],
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    pushHistory,
    undo,
    redo,
  };
};

// Keyboard Shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);
```

---

### 3. Grafik-Bibliothek (50 Icons)

**Features:**
- [ ] Icon-Library Panel
- [ ] Kategorien: Hochzeit, Geburtstag, Allgemein
- [ ] Drag Icon auf Canvas
- [ ] SVG-Icons resizable ohne Qualitätsverlust

**Icon-Quellen:**
- Lucide Icons (bereits im Projekt)
- Custom SVGs in `/public/invitation-icons/`

**Implementierung:**
```typescript
const IconLibrary = ({ onIconAdd }) => {
  const categories = {
    wedding: ['Heart', 'Rings', 'Champagne', 'Cake'],
    birthday: ['Gift', 'Balloon', 'Confetti', 'Candle'],
    general: ['Camera', 'Music', 'Star', 'Flower'],
  };
  
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Icons</h3>
      {Object.entries(categories).map(([category, icons]) => (
        <div key={category} className="mb-4">
          <h4 className="text-sm font-medium mb-2 capitalize">{category}</h4>
          <div className="grid grid-cols-4 gap-2">
            {icons.map(icon => (
              <button
                key={icon}
                onClick={() => onIconAdd(icon)}
                className="p-2 border rounded hover:bg-gray-100"
              >
                {/* Render Lucide Icon */}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

### 4. Magnetische Hilfslinien

**Features:**
- [ ] Snap-to-Grid (optional 10px Raster)
- [ ] Snap-to-Center (horizontal/vertikal)
- [ ] Snap-to-Other-Elements (Alignment)
- [ ] Visuelle Guides beim Dragging

**Implementierung:**
```typescript
const SNAP_THRESHOLD = 5; // px

const snapToGuides = (pos: { x: number; y: number }, canvas: { width: number; height: number }, elements: CanvasElement[]) => {
  let { x, y } = pos;
  
  // Snap to center
  if (Math.abs(x - canvas.width / 2) < SNAP_THRESHOLD) x = canvas.width / 2;
  if (Math.abs(y - canvas.height / 2) < SNAP_THRESHOLD) y = canvas.height / 2;
  
  // Snap to other elements
  elements.forEach(el => {
    if (Math.abs(x - el.x) < SNAP_THRESHOLD) x = el.x;
    if (Math.abs(y - el.y) < SNAP_THRESHOLD) y = el.y;
  });
  
  return { x, y };
};
```

---

### 5. Filter (SW, Sepia)

**Features:**
- [ ] Schwarz-Weiß Filter
- [ ] Sepia Filter
- [ ] Brightness/Contrast Slider

**Implementierung (Konva):**
```typescript
import { Image as KonvaImage } from 'react-konva';
import Konva from 'konva';

<KonvaImage
  image={imageObj}
  filters={[Konva.Filters.Grayscale]} // or Sepia, Brighten, etc.
/>
```

---

### 6. Duplizieren (Strg+D)

**Features:**
- [ ] Element auswählen → Strg+D → Kopie erstellt (leicht versetzt)
- [ ] UI Button "Duplizieren"

**Implementierung:**
```typescript
const duplicateElement = (element: CanvasElement) => {
  const copy = {
    ...element,
    id: crypto.randomUUID(),
    x: element.x + 20,
    y: element.y + 20,
  };
  setElements([...elements, copy]);
};

// Keyboard Shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedElement) {
      e.preventDefault();
      duplicateElement(selectedElement);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedElement]);
```

---

## Phase 4: Admin & Batch (KW 12+, 5-7 Tage)

### 🎯 Ziel
Admin-Tools für Batch-Generierung und erweiterte Print-Kontrolle

---

### 1. Batch-PDF-Generierung

**Use Case:** Admin erstellt 50 Einladungen mit verschiedenen Gastnamen

**Features:**
- [ ] CSV-Import (Name, Tischnummer, etc.)
- [ ] Template auswählen
- [ ] Variable Felder markieren (z.B. `{{name}}`)
- [ ] Bulk-Export als einzelne PDFs oder ZIP

**Implementierung:**
```typescript
const BatchGenerator = ({ templateId }: { templateId: string }) => {
  const [csvData, setCsvData] = useState<Array<Record<string, string>>>([]);
  
  const handleCSVUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => setCsvData(results.data),
    });
  };
  
  const generateBatch = async () => {
    const pdfs = await Promise.all(
      csvData.map(async (row) => {
        const filledTemplate = fillTemplate(template, row);
        return await exportToPDF(filledTemplate);
      })
    );
    
    // Download as ZIP
    const zip = new JSZip();
    pdfs.forEach((pdf, i) => {
      zip.file(`einladung-${i + 1}.pdf`, pdf);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'einladungen-batch.zip');
  };
  
  return (
    <div>
      <input type="file" accept=".csv" onChange={(e) => handleCSVUpload(e.target.files[0])} />
      <Button onClick={generateBatch}>Batch generieren ({csvData.length} Stück)</Button>
    </div>
  );
};
```

---

### 2. CMYK-Export

**Features:**
- [ ] RGB → CMYK Konvertierung
- [ ] Color-Profile Handling (ISO Coated v2)
- [ ] Preview: "So sieht es im Druck aus"

**Hinweis:** Erfordert Backend-Integration (z.B. ImageMagick mit CMYK-Profile)

**Backend (Node.js):**
```typescript
import sharp from 'sharp';

const convertToCMYK = async (inputRGB: Buffer): Promise<Buffer> => {
  return await sharp(inputRGB)
    .toColorspace('cmyk')
    .toBuffer();
};
```

---

### 3. Erweiterte Print-Kontrolle

**Features:**
- [ ] Bleed-Control für Hosts (aktuell nur Admin)
- [ ] Crop-Marks für Hosts
- [ ] Mehrere Exemplare drucken (z.B. 10x selbes Design)

**UI:**
```typescript
<div className="space-y-4">
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      id="addBleed"
      checked={config.addBleed}
      onChange={(e) => setConfig({ ...config, addBleed: e.target.checked })}
    />
    <label htmlFor="addBleed">Beschnittzugabe hinzufügen (3mm)</label>
  </div>
  
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      id="addCropMarks"
      checked={config.addCropMarks}
      onChange={(e) => setConfig({ ...config, addCropMarks: e.target.checked })}
    />
    <label htmlFor="addCropMarks">Schnittmarken hinzufügen</label>
  </div>
  
  <div>
    <label>Anzahl Exemplare:</label>
    <input
      type="number"
      min="1"
      max="100"
      value={config.copies}
      onChange={(e) => setConfig({ ...config, copies: Number(e.target.value) })}
    />
  </div>
</div>
```

---

### 4. Template-Bibliothek

**Features:**
- [ ] Admin erstellt Templates
- [ ] Templates in Bibliothek speichern
- [ ] Hosts können aus Templates wählen
- [ ] Kategorien: Hochzeit, Geburtstag, Taufe, etc.

**Datenmodell:**
```typescript
export interface InvitationTemplate {
  id: string;
  name: string;
  category: 'wedding' | 'birthday' | 'baptism' | 'general';
  thumbnail: string; // URL
  elements: CanvasElement[]; // Pre-filled design
  isPublic: boolean;
  createdBy: string; // userId (Admin)
  createdAt: string;
}
```

---

## ✅ Definition of Done (Phase 3 + 4)

**Phase 3:**
- [ ] Layer-Management funktioniert (Reorder, Show/Hide, Lock)
- [ ] Undo/Redo mit Keyboard Shortcuts
- [ ] Icon-Library mit 50+ Icons
- [ ] Magnetische Hilfslinien beim Dragging
- [ ] Filter (SW, Sepia) anwendbar
- [ ] Duplizieren (Strg+D) funktioniert

**Phase 4:**
- [ ] Batch-PDF aus CSV funktioniert
- [ ] CMYK-Export implementiert (Backend)
- [ ] Bleed/Crop-Marks für Hosts verfügbar
- [ ] Template-Bibliothek (Admin kann erstellen, Hosts können nutzen)

---

## 🧪 Testing

**Manuelle Tests Phase 3:**
1. Layer-Panel: Reorder → Reihenfolge ändert sich ✅
2. Undo/Redo: Text ändern → Strg+Z → zurück ✅
3. Icon einfügen → Resizen → bleibt scharf ✅
4. Element verschieben → Snapped zu Center-Line ✅
5. Bild-Filter: SW anwenden → Bild wird grau ✅
6. Element duplizieren (Strg+D) → Kopie erscheint ✅

**Manuelle Tests Phase 4:**
1. CSV hochladen → Batch generieren → ZIP mit 50 PDFs ✅
2. CMYK-Preview → Farben sehen anders aus als RGB ✅
3. Bleed aktivieren → PDF hat 3mm Überhang ✅
4. Template erstellen (Admin) → Host kann auswählen ✅

---

**Status:** 📋 Ready for Planning  
**Dependencies:** Phase 2 muss abgeschlossen sein  
**Effort:** Phase 3 (10-14 Tage) + Phase 4 (5-7 Tage) = **15-21 Tage gesamt**
