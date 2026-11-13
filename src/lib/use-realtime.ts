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
// Backoff for reconnects the browser will not attempt itself.
const MIN_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

export function useRealtime(
  organizationId?: string | null,
  onEvent?: (event: CollaborationEvent) => void,
  // Called when the server can't replay what was missed and local state must be refetched.
  onResync?: () => void
) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onResyncRef = useRef(onResync);
  onResyncRef.current = onResync;

  useEffect(() => {
    if (!organizationId) {
      setStatus('disconnected');
      return;
    }

    // Connection states: connecting -> connected; on a dropped stream the browser retries by itself
    // (status: connecting) and sends Last-Event-ID. If the server *refuses* a reconnect (401, 403,
    // 503), the browser gives up for good (readyState CLOSED), so we reconnect ourselves with
    // backoff, passing the last seq we saw so the server replays the gap.
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = MIN_RETRY_MS;
    let lastSeq: number | null = null;
    let reopened = false;
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
        lastSeq = Math.max(lastSeq ?? 0, parsed.seq);
      }
      onEventRef.current?.(parsed);
    };

    const connect = () => {
      setStatus('connecting');
      const params = new URLSearchParams({ organizationId });
      if (lastSeq !== null) params.set('lastEventId', String(lastSeq));
      const source = new EventSource(`/api/v1/realtime/stream?${params}`);
      es = source;

      source.addEventListener('open', () => {
        retryDelay = MIN_RETRY_MS;
        setStatus('connected');
        // Reopened without a seq to resume from: nothing can be replayed, so refetch instead.
        if (reopened && lastSeq === null) onResyncRef.current?.();
      });
      for (const type of EVENT_TYPES) source.addEventListener(type, handleEvent);
      source.addEventListener('system.resync', () => onResyncRef.current?.());

      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) {
          source.close();
          setStatus('disconnected');
          reopened = true;
          retryTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
        } else {
          setStatus('connecting'); // the browser is already retrying
        }
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimer);
      es?.close();
      setStatus('disconnected');
    };
  }, [organizationId]);

  return { status };
}

