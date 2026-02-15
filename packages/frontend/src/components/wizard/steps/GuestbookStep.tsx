'use client';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';

interface GuestbookStepProps {
  enabled: boolean;
  message: string;
  allowVoiceMessages: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onMessageChange: (message: string) => void;
  onAllowVoiceMessagesChange: (allow: boolean) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function GuestbookStep({
  enabled,
  message,
  allowVoiceMessages,
  onEnabledChange,
  onMessageChange,
  onAllowVoiceMessagesChange,
  onNext,
  onSkip,
  onBack,
}: GuestbookStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Gästebuch einrichten</h2>
        <p className="text-muted-foreground">Lass deine Gäste Glückwünsche hinterlassen</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
          <Checkbox checked={enabled} onCheckedChange={(checked) => onEnabledChange(!!checked)} />
          <label className="font-medium cursor-pointer" onClick={() => onEnabledChange(!enabled)}>
            Gästebuch aktivieren
          </label>
        </div>

        {enabled && (
          <>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Willkommensnachricht
              </label>
              <Textarea
                id="message"
                placeholder="Schreibt uns eure Glückwünsche!"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox checked={true} disabled />
                <span className="flex-1">Textnachrichten erlauben</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={allowVoiceMessages}
                    onCheckedChange={(checked) => onAllowVoiceMessagesChange(!!checked)}
                  />
                  <span className="flex-1">Sprachnachrichten erlauben</span>
                </div>
                <p className="text-xs text-muted-foreground ml-11">
                  💡 Auf lauten Events oft schwer verständlich
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Zurück
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>
            Überspringen
          </Button>
          <Button onClick={onNext}>Weiter</Button>
        </div>
      </div>
    </div>
  );
}
