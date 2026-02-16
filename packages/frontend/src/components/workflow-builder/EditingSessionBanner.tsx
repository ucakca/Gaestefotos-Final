'use client';

import { useEffect } from 'react';
import { AlertTriangle, User, Loader2, Lock } from 'lucide-react';
import { useWorkflowEditingSession } from '@/hooks/useWorkflowEditingSession';

interface EditingSessionBannerProps {
  workflowId: string | null;
  userName: string;
  isEditing: boolean;
  onConflict?: () => void;
}

/**
 * Shows a banner when another user is editing the same workflow.
 * Automatically claims/releases editing session based on isEditing prop.
 */
export function EditingSessionBanner({ workflowId, userName, isEditing, onConflict }: EditingSessionBannerProps) {
  const { session, claimSession, releaseSession, isConflict, conflictUser } = useWorkflowEditingSession(workflowId, userName);

  // Claim session when editing starts
  useEffect(() => {
    if (isEditing && workflowId) {
      claimSession();
    }
    return () => {
      if (isEditing && workflowId) {
        releaseSession();
      }
    };
  }, [isEditing, workflowId]);

  // Notify parent on conflict
  useEffect(() => {
    if (isConflict && onConflict) {
      onConflict();
    }
  }, [isConflict, onConflict]);

  // Show conflict banner
  if (isConflict) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Bearbeitungskonflikt</p>
          <p className="text-xs mt-0.5">
            <strong>{conflictUser}</strong> bearbeitet diesen Workflow gerade. Deine Änderungen könnten überschrieben werden.
          </p>
        </div>
        <Lock className="w-4 h-4 flex-shrink-0 text-amber-500" />
      </div>
    );
  }

  // Show who else is editing (when not in conflict but someone is editing)
  if (session.editing && !session.isMe && workflowId) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
        <User className="w-4 h-4 flex-shrink-0" />
        <p className="text-xs">
          <strong>{session.editingBy}</strong> bearbeitet diesen Workflow
        </p>
      </div>
    );
  }

  return null;
}
