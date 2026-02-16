'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Loader2, Search, X, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface AvailableWorkflow {
  id: string;
  name: string;
  description: string | null;
  flowType: string;
}

interface SubWorkflowPickerProps {
  onSelect: (workflow: AvailableWorkflow) => void;
  excludeWorkflowId?: string;
  className?: string;
}

/**
 * Dropdown picker for selecting a sub-workflow.
 * Loads available workflows from the API and lets the user pick one.
 */
export function SubWorkflowPicker({ onSelect, excludeWorkflowId, className = '' }: SubWorkflowPickerProps) {
  const [open, setOpen] = useState(false);
  const [workflows, setWorkflows] = useState<AvailableWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/workflows');
      const all: AvailableWorkflow[] = (data.workflows || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        flowType: w.flowType || 'CUSTOM',
      }));
      setWorkflows(excludeWorkflowId ? all.filter((w) => w.id !== excludeWorkflowId) : all);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [excludeWorkflowId]);

  useEffect(() => {
    if (open && workflows.length === 0) {
      loadWorkflows();
    }
  }, [open, loadWorkflows]);

  const filtered = search
    ? workflows.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.flowType.toLowerCase().includes(search.toLowerCase())
      )
    : workflows;

  const handleSelect = (wf: AvailableWorkflow) => {
    onSelect(wf);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20 text-sm text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/40 transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5" />
        Sub-Workflow
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Workflow suchen..."
                  autoFocus
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {search ? 'Keine Workflows gefunden' : 'Keine Workflows verfügbar'}
                </div>
              ) : (
                filtered.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => handleSelect(wf)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{wf.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{wf.flowType}</span>
                          {wf.description && (
                            <span className="text-[10px] text-muted-foreground truncate">{wf.description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
