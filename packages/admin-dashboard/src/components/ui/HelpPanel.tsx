'use client';

import { useState } from 'react';
import { HelpCircle, X, ExternalLink } from 'lucide-react';

interface HelpSection {
  title: string;
  content: string;
}

interface HelpPanelProps {
  title: string;
  sections: HelpSection[];
  docsLink?: string;
}

export function HelpButton({ title, sections, docsLink }: HelpPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg hover:bg-app-bg transition-colors text-app-muted hover:text-app-accent"
        title={`Hilfe: ${title}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-app-card border-l border-app-border shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-app-card border-b border-app-border p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-app-accent" />
                <h2 className="font-semibold text-app-fg">{title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-app-bg transition-colors text-app-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {sections.map((section, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold text-app-fg mb-1.5">{section.title}</h3>
                  <div className="text-sm text-app-muted leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              ))}

              {docsLink && (
                <a
                  href={docsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-app-accent hover:underline mt-4"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ausführliche Dokumentation
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
