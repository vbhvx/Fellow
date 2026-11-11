export interface CollaborationEnvelope {
  eventId: string;
  // Global outbox sequence; used as the SSE `id:` so clients can resume with Last-Event-ID.
  seq: number;
  type: string; // 'task.created' | 'task.updated' | 'task.moved' | 'task.deleted' | 'comment.created' | 'status.created'
  organizationId: string;
  projectId?: string;
  resourceId: string;
  version?: number;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface ClientConnection {
  connectionId: string;
  userId: string;
  organizationId: string;
  // authorizedProjectIds: Set of projects the user is authorized to receive events for
  authorizedProjectIds: Set<string>;
  isAdminOrOwner: boolean;
  // `frame` is the pre-serialized SSE frame for `event`, built once per broadcast.
  deliver(event: CollaborationEnvelope, frame: string): void;
  // Returns false when the client cannot keep up; the broker then drops it.
  hasCapacity(): boolean;
  close(): void;
}

// Single source of truth for event visibility, shared by live fan-out and Last-Event-ID replay.
export function canReceive(
  conn: Pick<ClientConnection, 'organizationId' | 'authorizedProjectIds' | 'isAdminOrOwner'>,
  event: Pick<CollaborationEnvelope, 'organizationId' | 'projectId'>
): boolean {
  // 1. Must belong to the same organization
  if (conn.organizationId !== event.organizationId) return false;
  // 2. If event is project-scoped, user must have access to that project
  if (event.projectId && !conn.isAdminOrOwner && !conn.authorizedProjectIds.has(event.projectId)) {
    return false;
  }
  return true;
}

export function formatSseFrame(event: CollaborationEnvelope): string {
  return `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Per-process fan-out to the SSE connections this instance holds. It is fed exclusively by the
 * Postgres LISTEN bus (see ./bus.ts), so every instance receives every committed event no matter
 * which instance (or worker) produced it.
 */
class RealtimeBroker {
  private connections: Map<string, ClientConnection> = new Map();

  public register(conn: ClientConnection) {
    this.connections.set(conn.connectionId, conn);
  }

  public unregister(connectionId: string) {
    this.connections.delete(connectionId);
  }

  public updateProjectAccess(connectionId: string, projectIds: string[]) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.authorizedProjectIds = new Set(projectIds);
    }
  }

  public broadcast(event: CollaborationEnvelope) {
    const frame = formatSseFrame(event);

    for (const conn of Array.from(this.connections.values())) {
      if (!canReceive(conn, event)) continue;

      if (!conn.hasCapacity()) {
        // Slow consumer: drop it rather than buffer unboundedly. The browser reconnects with
        // Last-Event-ID and the stream route replays what it missed from the outbox.
        this.connections.delete(conn.connectionId);
        conn.close();
        continue;
      }

      try {
        conn.deliver(event, frame);
      } catch {
        // Stale connection
        this.connections.delete(conn.connectionId);
      }
    }
  }

  public getActiveConnectionCount(organizationId?: string): number {
    if (!organizationId) return this.connections.size;
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.organizationId === organizationId) count++;
    }
    return count;
  }
}

// Global singleton instance (survives Next.js dev hot reloads)
const globalForBroker = globalThis as unknown as { realtimeBroker: RealtimeBroker };
export const broker = globalForBroker.realtimeBroker || new RealtimeBroker();
if (process.env.NODE_ENV !== 'production') globalForBroker.realtimeBroker = broker;
