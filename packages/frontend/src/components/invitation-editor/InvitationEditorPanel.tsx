'use client';

import { useState, useCallback, useMemo } from 'react';
import { InvitationDesignConfig, INVITATION_SIZES, InvitationSizePreset } from '@gaestefotos/shared';
import { InvitationCanvas } from './InvitationCanvas';
import { debounce } from 'lodash';

interface InvitationEditorPanelProps {
  eventId: string;
  eventSlug: string;
  initialDesign?: InvitationDesignConfig;
}

export function InvitationEditorPanel({
  eventId,
  eventSlug,
  initialDesign,
}: InvitationEditorPanelProps) {
  const [activeDesign, setActiveDesign] = useState<InvitationDesignConfig>(
    initialDesign || {
      id: 'default',
      name: 'Neue Einladung',
      width: 595,
      height: 842,
      backgroundColor: '#ffffff',
      elements: [],
    }
  );
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [sizePreset, setSizePreset] = useState<InvitationSizePreset>('a5-portrait');

  // Auto-save with debounce (1 second delay)
  const debouncedSave = useMemo(
    () =>
      debounce(async (design: InvitationDesignConfig) => {
        try {
          // TODO: Implement API endpoint in Phase 2.5
          // await fetch(`/api/events/${eventId}/invitation`, {
          //   method: 'PUT',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify(design),
          // });
          console.log('Auto-save:', design);
        } catch (error) {
          console.error('Failed to save invitation design:', error);
        }
      }, 1000),
    [eventId]
  );

  const handleConfigChange = useCallback(
    (newConfig: InvitationDesignConfig) => {
      setActiveDesign(newConfig);
      debouncedSave(newConfig);
    },
    [debouncedSave]
  );

  const handleSizeChange = useCallback((preset: InvitationSizePreset) => {
    setSizePreset(preset);
    const size = INVITATION_SIZES[preset];
    handleConfigChange({
      ...activeDesign,
      width: size.width,
      height: size.height,
    });
  }, [activeDesign, handleConfigChange]);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Tools & Properties */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">Einladungs-Editor</h2>
            <p className="text-sm text-gray-600">Event: {eventSlug}</p>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Format</label>
            <select
              value={sizePreset}
              onChange={(e) => handleSizeChange(e.target.value as InvitationSizePreset)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {Object.entries(INVITATION_SIZES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label} ({value.width}x{value.height}px)
                </option>
              ))}
            </select>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Hintergrundfarbe</label>
            <input
              type="color"
              value={activeDesign.backgroundColor}
              onChange={(e) =>
                handleConfigChange({
                  ...activeDesign,
                  backgroundColor: e.target.value,
                })
              }
              className="w-full h-10 rounded-md cursor-pointer"
            />
          </div>

          {/* Element Tools - Phase 2.3 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Elemente hinzufügen</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
              >
                + Text
              </button>
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
              >
                + Bild
              </button>
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
              >
                + Form
              </button>
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
              >
                + QR-Code
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Element-Tools kommen in Phase 2.3
            </p>
          </div>

          {/* Element Properties */}
          {selectedElementId && (
            <div className="space-y-2 pt-4 border-t">
              <label className="block text-sm font-medium">Element-Eigenschaften</label>
              <p className="text-sm text-gray-600">
                Element "{selectedElementId}" ausgewählt
              </p>
              {/* TODO: Phase 2.4 - Element properties panel */}
            </div>
          )}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 p-4">
        <InvitationCanvas
          config={activeDesign}
          onConfigChange={handleConfigChange}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
        />
      </div>

      {/* Right Sidebar - Layers */}
      <div className="w-64 bg-white border-l overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Ebenen</h3>
            <span className="text-xs text-gray-500">
              {activeDesign.elements.length} Element{activeDesign.elements.length !== 1 ? 'e' : ''}
            </span>
          </div>
          
          <LayerPanel
            elements={activeDesign.elements}
            selectedId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onReorderElement={handleReorderElement}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDeleteElement={handleDeleteElement}
          />
        </div>
      </div>
    </div>
  );
}
