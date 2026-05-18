export interface CollaborationEnvelope {
  eventId: string;
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
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
}

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
    const data = `id: ${event.eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    const activeConns = Array.from(this.connections.values());
    for (const conn of activeConns) {
      // 1. Must belong to the same organization
      if (conn.organizationId !== event.organizationId) {
        continue;
      }

      // 2. If event is project-scoped, user must have access to that project
      if (event.projectId) {
        if (!conn.isAdminOrOwner && !conn.authorizedProjectIds.has(event.projectId)) {
          // Deny event to clients lacking project access! (Tenant & Project Isolation)
          continue;
        }
      }

      try {
        conn.controller.enqueue(conn.encoder.encode(data));
      } catch (err) {
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

// Global singleton instance
const globalForBroker = globalThis as unknown as { realtimeBroker: RealtimeBroker };
export const broker = globalForBroker.realtimeBroker || new RealtimeBroker();
if (process.env.NODE_ENV !== 'production') globalForBroker.realtimeBroker = broker;
