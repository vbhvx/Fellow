'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export interface CollaborationEvent {
  eventId: string;
  type: string;
  organizationId: string;
  projectId?: string;
  resourceId: string;
  version?: number;
  occurredAt: string;
  payload: Record<string, any>;
}

export function useRealtime(
  organizationId?: string | null,
  onEvent?: (event: CollaborationEvent) => void
) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!organizationId) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const es = new EventSource(`/api/v1/realtime/stream?organizationId=${organizationId}`);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setStatus('connected');
    });

    const handleEvent = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as CollaborationEvent;
        if (onEventRef.current) {
          onEventRef.current(parsed);
        }
      } catch (err) {
        // Ignore ping comments or parse errors
      }
    };

    es.addEventListener('task.created', handleEvent);
    es.addEventListener('task.updated', handleEvent);
    es.addEventListener('task.moved', handleEvent);
    es.addEventListener('task.deleted', handleEvent);
    es.addEventListener('comment.created', handleEvent);
    es.addEventListener('status.created', handleEvent);

    es.onerror = () => {
      setStatus('disconnected');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setStatus('disconnected');
    };
  }, [organizationId]);

  return { status };
}

