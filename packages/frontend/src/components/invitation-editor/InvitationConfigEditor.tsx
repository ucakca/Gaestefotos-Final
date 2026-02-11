'use client';

import logger from '@/lib/logger';

import { useState } from 'react';
import { InvitationConfig, InvitationGuestGroup, InvitationScheduleItem } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Plus, Trash2, Calendar, MapPin, Users, Settings, Palette } from 'lucide-react';

interface InvitationConfigEditorProps {
  invitationId: string;
  initialConfig: Partial<InvitationConfig>;
  onSave: (config: Partial<InvitationConfig>) => Promise<void>;
  onClose: () => void;
}

export function InvitationConfigEditor({ invitationId, initialConfig, onSave, onClose }: InvitationConfigEditorProps) {
  const [config, setConfig] = useState<Partial<InvitationConfig>>(initialConfig || {});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'design' | 'groups' | 'schedule' | 'locations'>('basic');

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(config);
      onClose();
    } catch (err) {
      logger.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addGuestGroup = () => {
    const groups = config.availableGroups || [];
    groups.push({
      slug: `gruppe-${groups.length + 1}`,
      name: `Gruppe ${groups.length + 1}`,
      canSeeCeremony: true,
      canSeeReception: true,
      canSeeParty: true,
    });
    setConfig({ ...config, availableGroups: groups });
  };

  const removeGuestGroup = (index: number) => {
    const groups = [...(config.availableGroups || [])];
    groups.splice(index, 1);
    setConfig({ ...config, availableGroups: groups });
  };

  const addScheduleItem = () => {
    const items = config.schedule || [];
    items.push({
      time: '14:00',
      title: 'Neuer Programmpunkt',
      icon: 'Calendar',
      visibleForGroups: ['all'],
    });
    setConfig({ ...config, schedule: items });
  };

  const removeScheduleItem = (index: number) => {
    const items = [...(config.schedule || [])];
    items.splice(index, 1);
    setConfig({ ...config, schedule: items });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Einladung konfigurieren</h2>
          <Button onClick={onClose} variant="ghost" size="sm">✕</Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 flex gap-4 overflow-x-auto">
          {[
            { id: 'basic', label: 'Basis', icon: Settings },
            { id: 'design', label: 'Design', icon: Palette },
            { id: 'groups', label: 'Gästegruppen', icon: Users },
            { id: 'schedule', label: 'Zeitplan', icon: Calendar },
            { id: 'locations', label: 'Locations', icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'basic' | 'design' | 'groups' | 'schedule' | 'locations')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-rose text-rose font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}

        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Paar-Namen</label>
                <Input
                  value={config.coupleNames || ''}
                  onChange={(e) => setConfig({ ...config, coupleNames: e.target.value })}
                  placeholder="Anna & Max"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Willkommenstext</label>
                <Textarea
                  value={config.welcomeText || ''}
                  onChange={(e) => setConfig({ ...config, welcomeText: e.target.value })}
                  placeholder="Wir freuen uns, euch bei unserer Hochzeit zu begrüßen!"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hintergrundbild-URL</label>
                <Input
                  value={config.backgroundImageUrl || ''}
                  onChange={(e) => setConfig({ ...config, backgroundImageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Design-Theme</label>
                <select
                  value={config.themePreset || 'classic'}
                  onChange={(e) => setConfig({ ...config, themePreset: e.target.value as 'classic' | 'boho' | 'modern' | 'minimal' })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="classic">Klassisch</option>
                  <option value="boho">Boho</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={config.showCountdown || false}
                  onCheckedChange={(checked) => setConfig({ ...config, showCountdown: !!checked })}
                />
                <label className="text-sm font-medium">Countdown anzeigen</label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={config.rsvpEnabled || false}
                  onCheckedChange={(checked) => setConfig({ ...config, rsvpEnabled: !!checked })}
                />
                <label className="text-sm font-medium">RSVP-Formular aktivieren</label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={config.showGalleryLink || false}
                  onCheckedChange={(checked) => setConfig({ ...config, showGalleryLink: !!checked })}
                />
                <label className="text-sm font-medium">Link zur Foto-Galerie anzeigen</label>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Persönliche Nachricht</label>
                <Textarea
                  value={(config as any).message || ''}
                  onChange={(e) => setConfig({ ...config, message: e.target.value } as any)}
                  placeholder="Wir freuen uns auf euch! Bitte bringt gute Laune mit."
                  rows={3}
                />
                <p className="text-xs text-gray-400 mt-1">Wird unter dem Titel auf der Einladungskarte angezeigt</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Akzentfarbe</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={(config as any).design?.accentColor || '#6366f1'}
                    onChange={(e) => setConfig({ ...config, design: { ...((config as any).design || {}), accentColor: e.target.value } } as any)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={(config as any).design?.accentColor || '#6366f1'}
                    onChange={(e) => setConfig({ ...config, design: { ...((config as any).design || {}), accentColor: e.target.value } } as any)}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Hauptfarbe des Einladungsdesigns</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hintergrundbild (URL)</label>
                <Input
                  value={(config as any).design?.backgroundImage || ''}
                  onChange={(e) => setConfig({ ...config, design: { ...((config as any).design || {}), backgroundImage: e.target.value } } as any)}
                  placeholder="https://example.com/bild.jpg"
                />
                <p className="text-xs text-gray-400 mt-1">Wird als Hero-Hintergrund auf der Einladungskarte verwendet</p>
                {(config as any).design?.backgroundImage && (
                  <div className="mt-3 rounded-xl overflow-hidden border h-32">
                    <img
                      src={(config as any).design.backgroundImage}
                      alt="Vorschau"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <h4 className="text-sm font-medium text-indigo-800 mb-1">Vorschau-Tipp</h4>
                <p className="text-xs text-indigo-600">Die Einladungskarte ist unter /i/[slug] erreichbar. Änderungen werden sofort sichtbar.</p>
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Definiere verschiedene Gästegruppen mit unterschiedlichen Berechtigungen</p>
                <Button onClick={addGuestGroup} size="sm">
                  <Plus size={16} className="mr-2" />
                  Gruppe
                </Button>
              </div>

              {(config.availableGroups || []).map((group, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      value={group.name}
                      onChange={(e) => {
                        const groups = [...(config.availableGroups || [])];
                        groups[index].name = e.target.value;
                        setConfig({ ...config, availableGroups: groups });
                      }}
                      placeholder="Gruppenname"
                      className="flex-1"
                    />
                    <Button onClick={() => removeGuestGroup(index)} variant="ghost" size="sm">
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={group.canSeeCeremony}
                        onCheckedChange={(checked) => {
                          const groups = [...(config.availableGroups || [])];
                          groups[index].canSeeCeremony = !!checked;
                          setConfig({ ...config, availableGroups: groups });
                        }}
                      />
                      Trauung
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={group.canSeeReception}
                        onCheckedChange={(checked) => {
                          const groups = [...(config.availableGroups || [])];
                          groups[index].canSeeReception = !!checked;
                          setConfig({ ...config, availableGroups: groups });
                        }}
                      />
                      Empfang
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={group.canSeeParty}
                        onCheckedChange={(checked) => {
                          const groups = [...(config.availableGroups || [])];
                          groups[index].canSeeParty = !!checked;
                          setConfig({ ...config, availableGroups: groups });
                        }}
                      />
                      Feier
                    </label>
                  </div>
                </div>
              ))}

              {(!config.availableGroups || config.availableGroups.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  Noch keine Gruppen definiert. Klicke auf "+ Gruppe" um zu starten.
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Zeitplan für den Event-Ablauf</p>
                <Button onClick={addScheduleItem} size="sm">
                  <Plus size={16} className="mr-2" />
                  Punkt
                </Button>
              </div>

              {(config.schedule || []).map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      value={item.time}
                      onChange={(e) => {
                        const items = [...(config.schedule || [])];
                        items[index].time = e.target.value;
                        setConfig({ ...config, schedule: items });
                      }}
                      placeholder="14:00"
                      className="w-24"
                    />
                    <Input
                      value={item.title}
                      onChange={(e) => {
                        const items = [...(config.schedule || [])];
                        items[index].title = e.target.value;
                        setConfig({ ...config, schedule: items });
                      }}
                      placeholder="Titel"
                      className="flex-1"
                    />
                    <Button onClick={() => removeScheduleItem(index)} variant="ghost" size="sm">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Trauungs-Location</h3>
                <Input
                  value={config.ceremonyLocation?.name || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    ceremonyLocation: { ...(config.ceremonyLocation || {}), name: e.target.value } as any as any,
                  })}
                  placeholder="Name der Location"
                  className="mb-2"
                />
                <Input
                  value={config.ceremonyLocation?.address || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    ceremonyLocation: { ...(config.ceremonyLocation || {}), address: e.target.value } as any,
                  })}
                  placeholder="Adresse"
                />
              </div>

              <div>
                <h3 className="font-medium mb-3">Empfangs-Location</h3>
                <Input
                  value={config.receptionLocation?.name || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    receptionLocation: { ...(config.receptionLocation || {}), name: e.target.value } as any,
                  })}
                  placeholder="Name der Location"
                  className="mb-2"
                />
                <Input
                  value={config.receptionLocation?.address || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    receptionLocation: { ...(config.receptionLocation || {}), address: e.target.value } as any,
                  })}
                  placeholder="Adresse"
                />
              </div>

              <div>
                <h3 className="font-medium mb-3">Party-Location</h3>
                <Input
                  value={config.partyLocation?.name || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    partyLocation: { ...(config.partyLocation || {}), name: e.target.value } as any,
                  })}
                  placeholder="Name der Location"
                  className="mb-2"
                />
                <Input
                  value={config.partyLocation?.address || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    partyLocation: { ...(config.partyLocation || {}), address: e.target.value } as any,
                  })}
                  placeholder="Adresse"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button onClick={onClose} variant="ghost">Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </div>
      </div>
    </div>
  );
}
