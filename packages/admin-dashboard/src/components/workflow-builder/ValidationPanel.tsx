'use client';

import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Info, X, ChevronDown, ChevronRight,
  Bug, Lightbulb, Target,
} from 'lucide-react';
import type { ValidationResult, ValidationIssue } from './validation';

interface ValidationPanelProps {
  result: ValidationResult;
  onClose: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export default function ValidationPanel({ result, onClose, onFocusNode }: ValidationPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    result.errors.length > 0 ? 'errors' : result.warnings.length > 0 ? 'warnings' : null
  );

  const totalIssues = result.errors.length + result.warnings.length + result.infos.length;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[520px] max-h-[360px] bg-card rounded-xl border border-border shadow-2xl z-30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-border ${result.valid ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <div className="flex items-center gap-2">
          {result.valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          )}
          <span className="font-semibold text-sm text-foreground">
            {result.valid ? 'Workflow ist valide' : 'Validierung fehlgeschlagen'}
          </span>
          {totalIssues > 0 && (
            <span className="text-xs text-muted-foreground">
              ({result.errors.length} Fehler, {result.warnings.length} Warnungen, {result.infos.length} Hinweise)
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/5">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {totalIssues === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Keine Probleme gefunden</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {result.errors.length > 0 && (
              <IssueSection
                title="Fehler"
                icon={<Bug className="w-4 h-4 text-destructive" />}
                issues={result.errors}
                expanded={expandedSection === 'errors'}
                onToggle={() => setExpandedSection(expandedSection === 'errors' ? null : 'errors')}
                onFocusNode={onFocusNode}
                color="text-destructive"
                bgColor="bg-destructive/5"
              />
            )}
            {result.warnings.length > 0 && (
              <IssueSection
                title="Warnungen"
                icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                issues={result.warnings}
                expanded={expandedSection === 'warnings'}
                onToggle={() => setExpandedSection(expandedSection === 'warnings' ? null : 'warnings')}
                onFocusNode={onFocusNode}
                color="text-amber-600"
                bgColor="bg-amber-50"
              />
            )}
            {result.infos.length > 0 && (
              <IssueSection
                title="Hinweise"
                icon={<Lightbulb className="w-4 h-4 text-blue-500" />}
                issues={result.infos}
                expanded={expandedSection === 'infos'}
                onToggle={() => setExpandedSection(expandedSection === 'infos' ? null : 'infos')}
                onFocusNode={onFocusNode}
                color="text-blue-600"
                bgColor="bg-blue-50"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IssueSection({
  title,
  icon,
  issues,
  expanded,
  onToggle,
  onFocusNode,
  color,
  bgColor,
}: {
  title: string;
  icon: React.ReactNode;
  issues: ValidationIssue[];
  expanded: boolean;
  onToggle: () => void;
  onFocusNode?: (nodeId: string) => void;
  color: string;
  bgColor: string;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        {icon}
        <span className={`font-medium ${color}`}>{title} ({issues.length})</span>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {issues.map((issue, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${bgColor} cursor-default`}
              onClick={() => issue.nodeId && onFocusNode?.(issue.nodeId)}
            >
              <span className="flex-1">{issue.message}</span>
              {issue.nodeId && onFocusNode && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFocusNode(issue.nodeId!); }}
                  className="shrink-0 p-0.5 rounded hover:bg-black/10"
                  title="Zum Node springen"
                >
                  <Target className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
