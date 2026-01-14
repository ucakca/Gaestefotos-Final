'use client';

interface TextEditorProps {
  headerText: string;
  footerText: string;
  onChange: (headerText: string, footerText: string) => void;
}

export function TextEditor({ headerText, footerText, onChange }: TextEditorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">Texte</label>

      <div>
        <label className="block text-xs text-muted-foreground mb-2">Überschrift</label>
        <input
          type="text"
          value={headerText}
          onChange={(e) => onChange(e.target.value, footerText)}
          placeholder="z.B. Teile deine Fotos!"
          maxLength={100}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose"
        />
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-2">Fußzeile</label>
        <input
          type="text"
          value={footerText}
          onChange={(e) => onChange(headerText, e.target.value)}
          placeholder="z.B. Scanne mich"
          maxLength={100}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose"
        />
      </div>
    </div>
  );
}
