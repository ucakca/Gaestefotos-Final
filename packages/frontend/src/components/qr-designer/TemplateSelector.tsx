'use client';

import { QRTemplate, QR_TEMPLATES } from '@gaestefotos/shared';

interface TemplateSelectorProps {
  selected: QRTemplate;
  onChange: (template: QRTemplate) => void;
}

export function TemplateSelector({ selected, onChange }: TemplateSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-3">Vorlage</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.keys(QR_TEMPLATES) as QRTemplate[]).map((templateKey) => {
          const template = QR_TEMPLATES[templateKey];
          return (
            <button
              key={templateKey}
              onClick={() => onChange(templateKey)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selected === templateKey
                  ? 'border-rose bg-rose/5'
                  : 'border-border hover:border-rose/30'
              }`}
            >
              <div className="font-semibold mb-1">{template.name}</div>
              <div className="text-xs text-muted-foreground">
                {template.frameStyle.replace('-', ' ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
