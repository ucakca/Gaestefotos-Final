'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

interface EditingSession {
  editing: boolean;
  editingBy: string | null;
  editingUserId: string | null;
  isMe: boolean;
  editingSince: number | null;
}

interface UseWorkflowEditingSessionReturn {
  session: EditingSession;
  claimSession: () => Promise<boolean>;
  releaseSession: () => Promise<void>;
  isConflict: boolean;
  conflictUser: string | null;
}

const HEARTBEAT_INTERVAL = 25_000; // 25s (server timeout is 60s)

/**
 * Hook for managing workflow editing sessions.
 * Provides soft-locking so multiple admins don't edit the same workflow simultaneously.
 *
 * Usage:
 *   const { session, claimSession, releaseSession, isConflict, conflictUser } = useWorkflowEditingSession(workflowId, userName);
 *   // Call claimSession() when starting to edit
 *   // Call releaseSession() when done (also auto-released on unmount)
 */
export function useWorkflowEditingSession(
  workflowId: string | null,
  userName: string = 'Admin'
): UseWorkflowEditingSessionReturn {
  const [session, setSession] = useState<EditingSession>({
    editing: false,
    editingBy: null,
    editingUserId: null,
    isMe: false,
    editingSince: null,
  });
  const [isConflict, setIsConflict] = useState(false);
  const [conflictUser, setConflictUser] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const claimedRef = useRef(false);

  // Check session status
  const checkSession = useCallback(async () => {
    if (!workflowId) return;
    try {
      const { data } = await api.get(`/workflows/${workflowId}/editing`);
      setSession(data);
    } catch {
      // Ignore errors
    }
  }, [workflowId]);

  // Claim editing session
  const claimSession = useCallback(async (): Promise<boolean> => {
    if (!workflowId) return false;
    try {
      await api.post(`/workflows/${workflowId}/editing`, { userName });
      claimedRef.current = true;
      setIsConflict(false);
      setConflictUser(null);

      // Start heartbeat
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(async () => {
        try {
          await api.post(`/workflows/${workflowId}/editing`, { userName });
        } catch (err: any) {
          if (err?.response?.status === 423) {
            setIsConflict(true);
            setConflictUser(err.response.data?.editingBy || null);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          }
        }
      }, HEARTBEAT_INTERVAL);

      return true;
    } catch (err: any) {
      if (err?.response?.status === 423) {
        setIsConflict(true);
        setConflictUser(err.response.data?.editingBy || null);
      }
      return false;
    }
  }, [workflowId, userName]);

  // Release editing session
  const releaseSession = useCallback(async () => {
    if (!workflowId || !claimedRef.current) return;
    try {
      await api.delete(`/workflows/${workflowId}/editing`);
    } catch {
      // Ignore errors
    }
    claimedRef.current = false;
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, [workflowId]);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Cleanup on unmount or workflowId change
  useEffect(() => {
    return () => {
      if (claimedRef.current && workflowId) {
        // Fire and forget
        api.delete(`/workflows/${workflowId}/editing`).catch(() => {});
        claimedRef.current = false;
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [workflowId]);

  return {
    session,
    claimSession,
    releaseSession,
    isConflict,
    conflictUser,
  };
}
