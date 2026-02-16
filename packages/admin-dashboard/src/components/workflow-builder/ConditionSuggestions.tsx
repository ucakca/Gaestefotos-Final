'use client';

import { useMemo } from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData } from './types';

interface Suggestion {
  label: string;
  field: string;
  operator: string;
  value: string;
  reason: string;
}

interface ConditionSuggestionsProps {
  nodes: Node[];
  currentNodeId: string;
  onApply: (field: string, operator: string, value: string) => void;
}

export default function ConditionSuggestions({ nodes, currentNodeId, onApply }: ConditionSuggestionsProps) {
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];
    const nodeTypes = new Set(
      nodes
        .filter((n) => n.id !== currentNodeId)
        .map((n) => (n.data as unknown as WorkflowNodeData)?.type)
        .filter(Boolean)
    );

    // Context-aware suggestions based on what steps exist in the workflow

    if (nodeTypes.has('TAKE_PHOTO') || nodeTypes.has('TRIGGER_PHOTO_UPLOAD')) {
      result.push(
        {
          label: 'Foto ist von Booth',
          field: 'upload_source',
          operator: 'equals',
          value: 'booth',
          reason: 'TAKE_PHOTO Step erkannt',
        },
        {
          label: 'Foto ist Gast-Upload',
          field: 'upload_source',
          operator: 'equals',
          value: 'guest',
          reason: 'TRIGGER_PHOTO_UPLOAD erkannt',
        },
        {
          label: 'Gesicht erkannt',
          field: 'has_face',
          operator: 'is_true',
          value: 'true',
          reason: 'Nützlich für Face-basierte Features',
        },
      );
    }

    if (nodeTypes.has('AI_CATEGORIZE_PHOTO')) {
      result.push(
        {
          label: 'Kategorie ist People',
          field: 'category',
          operator: 'equals',
          value: 'people',
          reason: 'AI_CATEGORIZE_PHOTO Step vorhanden',
        },
        {
          label: 'Hoher Qualitäts-Score',
          field: 'quality_score',
          operator: 'greater_than',
          value: '0.8',
          reason: 'Gute Fotos filtern',
        },
      );
    }

    if (nodeTypes.has('AI_MODIFY') || nodeTypes.has('AI_CARTOON') || nodeTypes.has('AI_STYLE_POP')) {
      result.push({
        label: 'KI-Verarbeitung erfolgreich',
        field: 'ai_success',
        operator: 'is_true',
        value: 'true',
        reason: 'KI-Step erkannt — Fehlerfall abfangen',
      });
    }

    if (nodeTypes.has('LEAD_COLLECTION')) {
      result.push({
        label: 'E-Mail angegeben',
        field: 'has_email',
        operator: 'is_true',
        value: 'true',
        reason: 'LEAD_COLLECTION Step erkannt',
      });
    }

    if (nodeTypes.has('PRINT')) {
      result.push({
        label: 'Drucker verfügbar',
        field: 'printer_available',
        operator: 'is_true',
        value: 'true',
        reason: 'PRINT Step erkannt — Fallback nötig',
      });
    }

    if (nodeTypes.has('EMAIL_INVITE') || nodeTypes.has('EMAIL_REMINDER')) {
      result.push({
        label: 'RSVP ist Ja',
        field: 'rsvp_status',
        operator: 'equals',
        value: 'yes',
        reason: 'E-Mail-Step erkannt — nur Zusagen',
      });
    }

    // Always-useful suggestions
    result.push(
      {
        label: 'Mehr als 5 Fotos',
        field: 'photo_count',
        operator: 'greater_than',
        value: '5',
        reason: 'Allgemein nützlich',
      },
      {
        label: 'Ist kein Duplikat',
        field: 'is_duplicate',
        operator: 'is_false',
        value: 'false',
        reason: 'Duplikate aussortieren',
      },
    );

    return result;
  }, [nodes, currentNodeId]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
        Vorschläge
      </div>
      <div className="space-y-1.5">
        {suggestions.slice(0, 6).map((s, i) => (
          <button
            key={i}
            onClick={() => onApply(s.field, s.operator, s.value)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-amber-50 hover:border-amber-200 border border-transparent text-left transition-colors group"
          >
            <Zap className="w-3 h-3 text-amber-400 group-hover:text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/70 truncate">{s.reason}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
