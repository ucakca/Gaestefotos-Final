'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { WorkflowDefinition } from '@/lib/workflow-runtime/types';

/**
 * Fetch a workflow definition by its flowType from the backend.
 * Uses the public /api/workflows/by-type/:flowType endpoint.
 */
export function useWorkflow(flowType: string | null) {
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!flowType) {
      setDefinition(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .get(`/workflows/by-type/${flowType}`)
      .then((res) => {
        if (!mounted) return;
        const wf = res.data?.workflow;
        if (wf) {
          setDefinition({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            flowType: wf.flowType,
            steps: wf.steps,
          });
        } else {
          setError('Workflow nicht gefunden');
        }
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.response?.data?.error || 'Fehler beim Laden des Workflows');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [flowType]);

  return { definition, loading, error };
}
