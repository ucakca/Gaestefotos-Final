import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from './types';
import { STEP_TYPES } from './types';

export interface ValidationIssue {
  nodeId?: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
}

export function validateWorkflow(
  nodes: Node[],
  edges: Edge[],
  workflowName: string,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];

  // ── Global checks ──
  if (!workflowName.trim()) {
    errors.push({ severity: 'error', message: 'Workflow braucht einen Namen', field: 'name' });
  }

  if (nodes.length === 0) {
    errors.push({ severity: 'error', message: 'Workflow hat keine Steps' });
    return { valid: false, errors, warnings, infos };
  }

  // ── Check for trigger ──
  const triggerNodes = nodes.filter((n) => {
    const d = n.data as unknown as WorkflowNodeData;
    return d?.category === 'trigger';
  });

  if (triggerNodes.length === 0) {
    warnings.push({ severity: 'warning', message: 'Kein Trigger-Step vorhanden. Workflow wird nicht automatisch gestartet.' });
  }

  if (triggerNodes.length > 1) {
    infos.push({ severity: 'info', message: `${triggerNodes.length} Trigger-Steps gefunden. Workflow hat mehrere Einstiegspunkte.` });
  }

  // ── Check each node ──
  for (const node of nodes) {
    const d = node.data as unknown as WorkflowNodeData;
    if (!d?.type) {
      errors.push({ nodeId: node.id, severity: 'error', message: `Node "${node.id}" hat keinen Step-Typ` });
      continue;
    }

    const stepDef = STEP_TYPES.find((s) => s.type === d.type);
    if (!stepDef) {
      warnings.push({ nodeId: node.id, severity: 'warning', message: `Unbekannter Step-Typ: "${d.type}"` });
      continue;
    }

    // Check required config fields
    for (const field of stepDef.configFields) {
      const val = d.config?.[field.key];
      if (field.type === 'text' || field.type === 'textarea') {
        // Text fields that have a placeholder are likely required
        if (field.key === 'prompt' && (!val || !String(val).trim())) {
          warnings.push({
            nodeId: node.id,
            severity: 'warning',
            message: `"${d.label}" (Step ${d.stepNumber}): Feld "${field.label}" ist leer`,
            field: field.key,
          });
        }
      }
      if (field.type === 'number' && val !== undefined) {
        if (field.min !== undefined && Number(val) < field.min) {
          errors.push({
            nodeId: node.id,
            severity: 'error',
            message: `"${d.label}" (Step ${d.stepNumber}): "${field.label}" muss mindestens ${field.min} sein (ist ${val})`,
            field: field.key,
          });
        }
        if (field.max !== undefined && Number(val) > field.max) {
          errors.push({
            nodeId: node.id,
            severity: 'error',
            message: `"${d.label}" (Step ${d.stepNumber}): "${field.label}" darf maximal ${field.max} sein (ist ${val})`,
            field: field.key,
          });
        }
      }
    }

    // Check outgoing edges
    const outgoing = edges.filter((e) => e.source === node.id);
    if (outgoing.length === 0 && d.category !== 'cloud' && d.category !== 'hardware') {
      // Non-terminal nodes should have at least one outgoing edge
      const isTerminal = ['AFTER_SHARE', 'ZIP_DOWNLOAD', 'PRINT', 'BOOTH_DISPLAY', 'SLIDESHOW', 'GALLERY_EMBED'].includes(d.type);
      if (!isTerminal) {
        warnings.push({
          nodeId: node.id,
          severity: 'warning',
          message: `"${d.label}" (Step ${d.stepNumber}) hat keine ausgehende Verbindung`,
        });
      }
    }

    // Check incoming edges (except triggers)
    const incoming = edges.filter((e) => e.target === node.id);
    if (incoming.length === 0 && d.category !== 'trigger') {
      warnings.push({
        nodeId: node.id,
        severity: 'warning',
        message: `"${d.label}" (Step ${d.stepNumber}) ist nicht erreichbar (keine eingehende Verbindung)`,
      });
    }
  }

  // ── Check for cycles (simple DFS) ──
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  let hasCycle = false;

  function dfs(nodeId: string) {
    if (stack.has(nodeId)) { hasCycle = true; return; }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    stack.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) || []) {
      dfs(neighbor);
      if (hasCycle) return;
    }
    stack.delete(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) dfs(node.id);
    if (hasCycle) break;
  }

  if (hasCycle) {
    // Cycles are allowed for LOOP steps but warn otherwise
    const hasLoopStep = nodes.some((n) => (n.data as unknown as WorkflowNodeData)?.type === 'LOOP');
    if (!hasLoopStep) {
      warnings.push({ severity: 'warning', message: 'Workflow enthält einen Zyklus ohne LOOP-Step. Mögliche Endlosschleife.' });
    } else {
      infos.push({ severity: 'info', message: 'Workflow enthält Zyklen (LOOP-Steps erkannt).' });
    }
  }

  // ── Check for orphaned edges ──
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      warnings.push({ severity: 'warning', message: `Edge "${edge.id}" zeigt auf nicht-existierende Nodes` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}
