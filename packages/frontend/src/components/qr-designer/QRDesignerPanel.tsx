'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { QRDesignConfig, QR_TEMPLATES } from '@gaestefotos/shared';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { QRPreview } from './QRPreview';
import { TemplateSelector } from './TemplateSelector';
import { ColorPicker } from './ColorPicker';
import { TextEditor } from './TextEditor';
import { FrameSelector } from './FrameSelector';
import { SizeSelector } from './SizeSelector';
import { DownloadButton } from './DownloadButton';

interface QRDesignerPanelProps {
  eventId: string;
  eventSlug: string;
  galleryUrl: string;
}

export function QRDesignerPanel({ eventId, eventSlug, galleryUrl }: QRDesignerPanelProps) {
  const [designs, setDesigns] = useState<QRDesignConfig[]>([]);
  const [activeDesign, setActiveDesign] = useState<QRDesignConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDesigns();
  }, [eventId]);

  const loadDesigns = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/events/${eventId}/qr-designs`);
      setDesigns(data.designs || []);
      
      const defaultDesign = data.designs?.find((d: QRDesignConfig) => d.isDefault);
      if (defaultDesign) {
        setActiveDesign(defaultDesign);
      } else if (data.designs?.length > 0) {
        setActiveDesign(data.designs[0]);
      }
    } catch (err) {
      console.error('Load QR designs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewDesign = () => {
    const newDesign: QRDesignConfig = {
      id: crypto.randomUUID(),
      name: `Design ${designs.length + 1}`,
      template: 'modern',
      colors: QR_TEMPLATES.modern.defaultColors,
      frameStyle: 'rounded',
      headerText: 'Teile deine Fotos!',
      footerText: 'Scanne mich',
      font: 'sans',
      fontSize: 24,
      sizePreset: 'table',
      isDefault: designs.length === 0,
    };
    setActiveDesign(newDesign);
  };

  const saveDesign = async () => {
    if (!activeDesign) return;

    try {
      setSaving(true);
      await api.put(`/events/${eventId}/qr-designs/${activeDesign.id}`, activeDesign);
      await loadDesigns();
      alert('QR-Design gespeichert!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const deleteDesign = async (designId: string) => {
    if (!confirm('Dieses Design wirklich löschen?')) return;

    try {
      await api.delete(`/events/${eventId}/qr-designs/${designId}`);
      await loadDesigns();
      if (activeDesign?.id === designId) {
        setActiveDesign(designs[0] || null);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Lädt QR-Designer...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">QR-Code Designer</h2>
        <Button onClick={createNewDesign} size="sm">
          <Plus size={16} className="mr-2" />
          Neues Design
        </Button>
      </div>

      {/* Design List */}
      {designs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {designs.map((design) => (
            <button
              key={design.id}
              onClick={() => setActiveDesign(design)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                activeDesign?.id === design.id
                  ? 'bg-rose text-white border-rose'
                  : 'bg-white border-border hover:border-rose/50'
              }`}
            >
              {design.name}
              {design.isDefault && <span className="ml-2 text-xs">(Standard)</span>}
            </button>
          ))}
        </div>
      )}

      {activeDesign ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Design-Name</label>
              <input
                type="text"
                value={activeDesign.name}
                onChange={(e) => setActiveDesign({ ...activeDesign, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose"
              />
            </div>

            <TemplateSelector
              selected={activeDesign.template}
              onChange={(template) => {
                const templateConfig = QR_TEMPLATES[template];
                setActiveDesign({
                  ...activeDesign,
                  template,
                  colors: templateConfig.defaultColors,
                  frameStyle: templateConfig.frameStyle,
                });
              }}
            />

            <ColorPicker
              colors={activeDesign.colors}
              onChange={(colors) => setActiveDesign({ ...activeDesign, colors })}
            />

            <FrameSelector
              selected={activeDesign.frameStyle}
              onChange={(frameStyle) => setActiveDesign({ ...activeDesign, frameStyle })}
            />

            <TextEditor
              headerText={activeDesign.headerText || ''}
              footerText={activeDesign.footerText || ''}
              onChange={(headerText, footerText) =>
                setActiveDesign({ ...activeDesign, headerText, footerText })
              }
            />

            <SizeSelector
              selected={activeDesign.sizePreset}
              onChange={(sizePreset) => setActiveDesign({ ...activeDesign, sizePreset })}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isDefault"
                checked={activeDesign.isDefault || false}
                onChange={(e) => setActiveDesign({ ...activeDesign, isDefault: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isDefault" className="text-sm font-medium">
                Als Standard-Design festlegen
              </label>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveDesign} disabled={saving} className="flex-1">
                {saving ? 'Speichert...' : 'Speichern'}
              </Button>
              {designs.length > 1 && (
                <Button
                  onClick={() => deleteDesign(activeDesign.id)}
                  variant="secondary"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-4">
            <QRPreview config={activeDesign} galleryUrl={galleryUrl} />
            <DownloadButton config={activeDesign} eventId={eventId} eventSlug={eventSlug} />
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">Noch keine QR-Code Designs vorhanden.</p>
          <Button onClick={createNewDesign}>
            <Plus size={16} className="mr-2" />
            Erstes Design erstellen
          </Button>
        </div>
      )}
    </div>
  );
}
