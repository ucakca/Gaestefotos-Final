"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Printer, Check, QrCode, Palette, ImageIcon, Type, Sparkles, Heart, Camera, Flower2 } from "lucide-react";

// Erweiterte Farbpaletten
const colorPresets = [
  { name: "Klassisch", fg: "#000000", bg: "#ffffff", accent: "#000000" },
  { name: "Elegant Gold", fg: "#D4AF37", bg: "#1a1a1a", accent: "#FFD700" },
  { name: "Rosa Traum", fg: "#e91e63", bg: "#fff5f8", accent: "#f48fb1" },
  { name: "Mint Frisch", fg: "#00897b", bg: "#e0f2f1", accent: "#26a69a" },
  { name: "Lavendel", fg: "#7e57c2", bg: "#f3e5f5", accent: "#9575cd" },
  { name: "Pfirsich", fg: "#ff6f61", bg: "#fff8f6", accent: "#ff8a80" },
  { name: "Saphir", fg: "#1e3a8a", bg: "#eff6ff", accent: "#3b82f6" },
  { name: "Smaragd", fg: "#065f46", bg: "#ecfdf5", accent: "#10b981" },
  { name: "Bordeaux", fg: "#7f1d1d", bg: "#fef2f2", accent: "#dc2626" },
  { name: "Champagner", fg: "#78716c", bg: "#fafaf9", accent: "#a8a29e" },
];

// QR Code Stil-Presets
const stylePresets = [
  { name: "Standard", cornerRadius: 0, dotStyle: "square", pattern: "squares" },
  { name: "Abgerundet", cornerRadius: 20, dotStyle: "rounded", pattern: "rounded" },
  { name: "Dots", cornerRadius: 50, dotStyle: "dots", pattern: "dots" },
  { name: "Elegant", cornerRadius: 15, dotStyle: "mixed", pattern: "elegant" },
];

// Design Templates inspiriert von weddies
const designTemplates = [
  {
    id: "minimal",
    name: "Minimal Elegant",
    category: "Hochzeit",
    preview: "minimal",
    config: {
      title: "Teilt eure Fotos",
      subtitle: "mit uns",
      fg: "#1a1a1a",
      bg: "#ffffff",
      layout: "centered",
      decoration: "none",
      font: "serif",
    },
  },
  {
    id: "romantic",
    name: "Romantisch",
    category: "Hochzeit",
    preview: "romantic",
    config: {
      title: "Love is in the air",
      subtitle: "Scannt & teilt eure Momente",
      fg: "#e91e63",
      bg: "#fff5f8",
      layout: "decorated",
      decoration: "hearts",
      font: "script",
    },
  },
  {
    id: "botanical",
    name: "Botanisch",
    category: "Hochzeit",
    preview: "botanical",
    config: {
      title: "Unsere Hochzeit",
      subtitle: "Teilt eure schönsten Momente",
      fg: "#2d5016",
      bg: "#f7f9f5",
      layout: "decorated",
      decoration: "floral",
      font: "serif",
    },
  },
  {
    id: "gold-luxury",
    name: "Gold Luxus",
    category: "Hochzeit",
    preview: "gold",
    config: {
      title: "Celebrate with us",
      subtitle: "Scan & Share",
      fg: "#D4AF37",
      bg: "#1a1a1a",
      layout: "framed",
      decoration: "geometric",
      font: "sans",
    },
  },
  {
    id: "modern-bold",
    name: "Modern Bold",
    category: "Business",
    preview: "modern",
    config: {
      title: "Scan to Connect",
      subtitle: "Share your experience",
      fg: "#3b82f6",
      bg: "#ffffff",
      layout: "minimal",
      decoration: "none",
      font: "sans",
    },
  },
  {
    id: "party-fun",
    name: "Party Spaß",
    category: "Geburtstag",
    preview: "party",
    config: {
      title: "Let's Party!",
      subtitle: "Teile deine Partybilder",
      fg: "#ec4899",
      bg: "#fdf2f8",
      layout: "playful",
      decoration: "confetti",
      font: "sans",
    },
  },
];

export default function QRStylerPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(designTemplates[0]);
  const [fgColor, setFgColor] = useState(selectedTemplate.config.fg);
  const [bgColor, setBgColor] = useState(selectedTemplate.config.bg);
  const [cornerRadius, setCornerRadius] = useState([20]);
  const [size, setSize] = useState([280]);
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState(selectedTemplate.config.title);
  const [subtitle, setSubtitle] = useState(selectedTemplate.config.subtitle);
  const [selectedCategory, setSelectedCategory] = useState("Alle");

  const eventUrl = "https://gaestefotos.app/e3/demo-event";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: "png" | "svg" | "pdf") => {
    console.log(`[v0] Downloading QR code as ${format}`);
  };

  const applyTemplate = (template: typeof designTemplates[0]) => {
    setSelectedTemplate(template);
    setFgColor(template.config.fg);
    setBgColor(template.config.bg);
    setTitle(template.config.title);
    setSubtitle(template.config.subtitle);
  };

  const categories = ["Alle", "Hochzeit", "Business", "Geburtstag"];
  const filteredTemplates = selectedCategory === "Alle" 
    ? designTemplates 
    : designTemplates.filter(t => t.category === selectedCategory);

  // Dekorations-Icons basierend auf Template
  const DecorationIcon = ({ decoration }: { decoration: string }) => {
    switch (decoration) {
      case "hearts": return <Heart className="h-4 w-4" />;
      case "floral": return <Flower2 className="h-4 w-4" />;
      case "confetti": return <Sparkles className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">QR-Code Designer</h1>
        <p className="text-muted-foreground">
          Erstelle wunderschöne QR-Codes mit professionellen Vorlagen
        </p>
      </div>

      {/* Template Gallery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Design Vorlagen
              </CardTitle>
              <CardDescription>
                Wähle eine professionelle Vorlage und passe sie an
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className={`group relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                  selectedTemplate.id === template.id
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Template Preview */}
                <div 
                  className="aspect-square rounded-md flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: template.config.bg }}
                >
                  {/* Simplified QR Preview */}
                  <div 
                    className="w-16 h-16 grid grid-cols-4 gap-0.5"
                  >
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-sm"
                        style={{ 
                          backgroundColor: Math.random() > 0.4 ? template.config.fg : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Decoration Overlay */}
                  {template.config.decoration !== "none" && (
                    <div className="absolute top-1 right-1 opacity-30">
                      <DecorationIcon decoration={template.config.decoration} />
                    </div>
                  )}
                </div>
                
                <div className="text-left">
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {template.category}
                  </Badge>
                </div>
                
                {selectedTemplate.id === template.id && (
                  <div className="absolute -top-2 -right-2">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Live Vorschau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              {/* QR Code Card mit Dekorationen */}
              <div 
                className="relative rounded-2xl p-8 shadow-2xl max-w-sm w-full"
                style={{ backgroundColor: bgColor }}
              >
                {/* Dekorative Elemente basierend auf Template */}
                {selectedTemplate.config.decoration === "hearts" && (
                  <>
                    <Heart className="absolute top-4 left-4 h-6 w-6 opacity-20" style={{ color: fgColor }} />
                    <Heart className="absolute top-4 right-4 h-6 w-6 opacity-20" style={{ color: fgColor }} />
                  </>
                )}
                {selectedTemplate.config.decoration === "floral" && (
                  <>
                    <Flower2 className="absolute top-4 left-4 h-8 w-8 opacity-15" style={{ color: fgColor }} />
                    <Flower2 className="absolute bottom-4 right-4 h-8 w-8 opacity-15 rotate-180" style={{ color: fgColor }} />
                  </>
                )}
                {selectedTemplate.config.decoration === "confetti" && (
                  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full opacity-30"
                        style={{
                          backgroundColor: fgColor,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          transform: `rotate(${Math.random() * 360}deg)`,
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {title && (
                  <h2 
                    className={`text-center font-bold mb-4 text-xl ${
                      selectedTemplate.config.font === 'script' ? 'font-serif italic' :
                      selectedTemplate.config.font === 'serif' ? 'font-serif' :
                      'font-sans'
                    }`}
                    style={{ color: fgColor }}
                  >
                    {title}
                  </h2>
                )}
                
                {/* QR Code */}
                <div 
                  className="relative mx-auto"
                  style={{ 
                    width: size[0], 
                    height: size[0],
                    backgroundColor: bgColor,
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    style={{ borderRadius: `${cornerRadius[0] / 10}%` }}
                  >
                    {Array.from({ length: 12 }).map((_, row) =>
                      Array.from({ length: 12 }).map((_, col) => {
                        const isCorner = 
                          (row < 3 && col < 3) || 
                          (row < 3 && col > 8) || 
                          (row > 8 && col < 3);
                        const isFilled = isCorner || Math.random() > 0.45;
                        
                        if (!isFilled) return null;
                        
                        return (
                          <rect
                            key={`${row}-${col}`}
                            x={col * 8.33 + 0.5}
                            y={row * 8.33 + 0.5}
                            width={7.5}
                            height={7.5}
                            rx={cornerRadius[0] / 15}
                            fill={fgColor}
                          />
                        );
                      })
                    )}
                  </svg>
                  
                  {logoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div 
                        className="rounded-lg p-2 shadow-lg"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div 
                          className="h-10 w-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold"
                        >
                          GF
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {subtitle && (
                  <p 
                    className={`text-center mt-4 opacity-80 ${
                      selectedTemplate.config.font === 'serif' ? 'font-serif' : 'font-sans'
                    }`}
                    style={{ color: fgColor }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Event URL */}
              <div className="flex items-center gap-2 w-full max-w-sm">
                <Input value={eventUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Download Options */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={() => handleDownload("png")} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PNG
                </Button>
                <Button onClick={() => handleDownload("svg")} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  SVG
                </Button>
                <Button onClick={() => handleDownload("pdf")} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization Settings */}
        <div className="space-y-6">
          <Tabs defaultValue="text">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">
                <Type className="h-4 w-4 mr-2" />
                Text
              </TabsTrigger>
              <TabsTrigger value="colors">
                <Palette className="h-4 w-4 mr-2" />
                Farben
              </TabsTrigger>
              <TabsTrigger value="style">
                <QrCode className="h-4 w-4 mr-2" />
                Stil
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Beschriftung</CardTitle>
                  <CardDescription>
                    Passe die Texte an dein Event an
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titel (oben)</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="z.B. Unsere Hochzeit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Untertitel (unten)</Label>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="z.B. Teilt eure Momente"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Farbpaletten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setFgColor(preset.fg);
                          setBgColor(preset.bg);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          fgColor === preset.fg && bgColor === preset.bg
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex gap-1">
                          <div 
                            className="h-8 w-4 rounded-l"
                            style={{ backgroundColor: preset.bg }}
                          />
                          <div 
                            className="h-8 w-4 rounded-r"
                            style={{ backgroundColor: preset.fg }}
                          />
                        </div>
                        <span className="text-sm font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Eigene Farben</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vordergrund</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={fgColor}
                          onChange={(e) => setFgColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hintergrund</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QR-Code Stil</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setCornerRadius([preset.cornerRadius])}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                          cornerRadius[0] === preset.cornerRadius
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="h-12 w-12 grid grid-cols-3 gap-0.5 p-1 bg-muted rounded">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div
                              key={i}
                              className="bg-foreground"
                              style={{ borderRadius: `${preset.cornerRadius / 10}%` }}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anpassungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Eckenradius</Label>
                      <span className="text-sm text-muted-foreground">{cornerRadius[0]}%</span>
                    </div>
                    <Slider
                      value={cornerRadius}
                      onValueChange={setCornerRadius}
                      max={50}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label>Größe</Label>
                      <span className="text-sm text-muted-foreground">{size[0]}px</span>
                    </div>
                    <Slider
                      value={size}
                      onValueChange={setSize}
                      min={200}
                      max={400}
                      step={20}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-0.5">
                      <Label>Logo im QR-Code</Label>
                      <p className="text-xs text-muted-foreground">Zeigt dein Logo zentral</p>
                    </div>
                    <Button
                      variant={logoEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLogoEnabled(!logoEnabled)}
                    >
                      {logoEnabled ? "An" : "Aus"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Print Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Druckvorlagen</CardTitle>
          <CardDescription>
            Fertige Layouts für verschiedene Formate - perfekt zum Drucken
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Tischkarte", desc: "A6 Hochformat", size: "10,5 x 14,8 cm" },
              { name: "Aufsteller", desc: "A5 Querformat", size: "21 x 14,8 cm" },
              { name: "Einladung", desc: "DIN Lang", size: "21 x 10,5 cm" },
              { name: "Poster", desc: "A3 Hochformat", size: "29,7 x 42 cm" },
              { name: "Untersetzer", desc: "Quadrat", size: "10 x 10 cm" },
              { name: "Lesezeichen", desc: "Schmal", size: "5 x 15 cm" },
              { name: "Visitenkarte", desc: "Standard", size: "8,5 x 5,5 cm" },
              { name: "Fotospiel", desc: "A5 Hochformat", size: "14,8 x 21 cm" },
            ].map((template) => (
              <button
                key={template.name}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="h-20 w-14 rounded bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ImageIcon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">{template.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">{template.size}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
