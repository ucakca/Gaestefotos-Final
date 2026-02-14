'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { Star, ChevronDown, ChevronUp, RefreshCw, Filter, Grid, List } from 'lucide-react';

interface QrTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  isPremium: boolean;
  defaultBgColor: string;
  defaultTextColor: string;
  defaultAccentColor: string;
  previewUrl: string | null;
}

const CATEGORIES = [
  { value: 'ALL', label: 'Alle' },
  { value: 'MINIMAL', label: 'Minimal' },
  { value: 'ELEGANT', label: 'Elegant' },
  { value: 'NATURAL', label: 'Natur' },
  { value: 'FESTIVE', label: 'Festlich' },
  { value: 'MODERN', label: 'Modern' },
  { value: 'RUSTIC', label: 'Rustikal' },
];

export default function QrTemplatesPage() {
  const [templates, setTemplates] = useState<QrTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/qr-templates');
      setTemplates(res.data.templates || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden der Templates');
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = categoryFilter === 'ALL' 
    ? templates 
    : templates.filter(t => t.category === categoryFilter);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">QR-Code Templates</h1>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">QR-Code Templates</h1>
            <p className="text-muted-foreground mt-1">
              {filteredTemplates.length} Vorlagen verfügbar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadTemplates}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-app-accent text-white' : 'hover:bg-background'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-app-accent text-white' : 'hover:bg-background'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-app-accent text-white'
                  : 'bg-background hover:bg-app-border text-muted-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-status-danger/10 border border-status-danger rounded-lg text-destructive">
            {error}
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Keine Templates in dieser Kategorie.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                >
                  {/* SVG Preview */}
                  <div 
                    className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden"
                    style={{ backgroundColor: template.defaultBgColor }}
                  >
                    <img
                      src={`/api/qr-templates/${template.slug}/A6`}
                      alt={template.name}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {template.isPremium && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> Premium
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-medium truncate">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORIES.find((c) => c.value === template.category)?.label}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: template.defaultBgColor }}
                        title="Hintergrund"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: template.defaultTextColor }}
                        title="Text"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: template.defaultAccentColor }}
                        title="Akzent"
                      />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredTemplates.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Keine Templates in dieser Kategorie.
              </Card>
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    {/* SVG Preview */}
                    <div 
                      className="w-16 h-20 rounded border border-border overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: template.defaultBgColor }}
                    >
                      <img
                        src={`/api/qr-templates/${template.slug}/A6`}
                        alt={template.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{template.name}</span>
                        {template.isPremium && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {CATEGORIES.find((c) => c.value === template.category)?.label} · {template.slug}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.defaultBgColor }}
                          title="Hintergrund"
                        />
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.defaultTextColor }}
                          title="Text"
                        />
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: template.defaultAccentColor }}
                          title="Akzent"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(expandedId === template.id ? null : template.id)
                        }
                      >
                        {expandedId === template.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === template.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-border mt-2">
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {['A6', 'A5', 'story', 'square'].map(format => (
                          <div key={format} className="text-center">
                            <div 
                              className="aspect-[3/4] bg-gray-100 rounded border overflow-hidden mb-1"
                              style={{ backgroundColor: template.defaultBgColor }}
                            >
                              <img
                                src={`/api/qr-templates/${template.slug}/${format}`}
                                alt={`${template.name} - ${format}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground uppercase">{format}</span>
                          </div>
                        ))}
                      </div>
                      {template.description && (
                        <p className="mt-4 text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
