'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type TemplateDef = { slug: string; label: string; category: string };

interface Step1TemplateProps {
  templates: TemplateDef[];
  selectedTemplate: string;
  onTemplateSelect: (slug: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  categories: Array<{ key: string; label: string }>;
  format: 'A6' | 'A5';
  onFormatChange: (format: 'A6' | 'A5') => void;
}

export default function Step1Template({
  templates,
  selectedTemplate,
  onTemplateSelect,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  format,
  onFormatChange,
}: Step1TemplateProps) {
  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'all') return templates;
    return templates.filter((t) => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-app-fg mb-2">Wähle dein Template</h2>
        <p className="text-sm text-app-muted">
          Wähle ein Design für deinen QR-Aufsteller. Du kannst später Texte und Farben anpassen.
        </p>
      </div>

      {/* Format Selection */}
      <div className="bg-app-card rounded-lg border border-app-border p-4">
        <label className="text-sm font-semibold text-app-fg mb-3 block">Format</label>
        <div className="flex gap-3">
          {(['A6', 'A5'] as const).map((f) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onFormatChange(f)}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all ${
                format === f
                  ? 'bg-app-accent text-app-bg shadow-lg'
                  : 'bg-app-bg border border-app-border text-app-fg hover:border-app-accent'
              }`}
            >
              {f}
              {format === f && <Check className="inline-block ml-2 w-4 h-4" />}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-app-card rounded-lg border border-app-border p-4">
        <label className="text-sm font-semibold text-app-fg mb-3 block">Kategorie</label>
        <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.key} value={cat.key}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplate === template.slug;

          return (
            <motion.button
              key={template.slug}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTemplateSelect(template.slug)}
              className={`relative aspect-[1/1.4] rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-app-accent shadow-lg ring-2 ring-app-accent/20'
                  : 'border-app-border hover:border-app-accent'
              }`}
            >
              {/* Template Preview */}
              <div className="w-full h-full bg-gradient-to-br from-app-bg to-app-card flex items-center justify-center">
                <img
                  src={`/qr-templates/${template.slug}/${format}-preview.jpg`}
                  alt={template.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback: show template name if preview not available
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-app-bg/80 backdrop-blur-sm">
                  <span className="text-xs font-semibold text-app-fg text-center px-2">
                    {template.label}
                  </span>
                </div>
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-7 h-7 bg-app-accent rounded-full flex items-center justify-center shadow-lg"
                >
                  <Check className="w-4 h-4 text-app-bg" />
                </motion.div>
              )}

              {/* Template Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-app-fg/90 to-transparent p-2">
                <p className="text-xs font-medium text-app-bg text-center">{template.label}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-app-muted">
          Keine Templates in dieser Kategorie verfügbar.
        </div>
      )}
    </div>
  );
}
