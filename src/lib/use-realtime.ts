'use client';

import { useEffect, useState, useRef } from 'react';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export interface CollaborationEvent {
  eventId: string;
  seq: number;
  type: string;
  organizationId: string;
  projectId?: string;
  resourceId: string;
  version?: number;
  occurredAt: string;
  payload: Record<string, unknown>;
}

const EVENT_TYPES = [
  'task.created',
  'task.updated',
  'task.moved',
  'task.deleted',
  'comment.created',
  'status.created',
] as const;

// Replayed and live deliveries can overlap around a reconnect; remember recent seqs to drop dupes.
const SEEN_SEQ_CAPACITY = 500;

export function useRealtime(
  organizationId?: string | null,
  onEvent?: (event: CollaborationEvent) => void,
  // Called when the server can't replay what was missed and local state must be refetched.
  onResync?: () => void
) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;

  useEffect(() => {
    if (!organizationId) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const es = new EventSource(`/api/v1/realtime/stream?organizationId=${encodeURIComponent(organizationId)}`);
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      setStatus('connected');
    });

    const seen = new Set<number>();

    const handleEvent = (e: MessageEvent) => {
      let parsed: CollaborationEvent;
      try {
        parsed = JSON.parse(e.data) as CollaborationEvent;
      } catch {
        return; // a malformed frame; only parsing is guarded, so handler bugs still surface
      }
      if (typeof parsed.seq === 'number') {
        if (seen.has(parsed.seq)) return;
        seen.add(parsed.seq);
        if (seen.size > SEEN_SEQ_CAPACITY) seen.delete(seen.values().next().value as number);
      }
      onEventRef.current?.(parsed);
    };

    for (const type of EVENT_TYPES) es.addEventListener(type, handleEvent);
    es.addEventListener('system.resync', () => onResyncRef.current?.());

    // EventSource reconnects on its own and sends Last-Event-ID, so the server replays the gap.
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

