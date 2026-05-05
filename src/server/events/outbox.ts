import { db, Database } from '@/db/client';
import { collaborationEvents } from '@/db/schema';
import { broker, CollaborationEnvelope } from '@/server/realtime/broker';
import { eq, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';

export interface EmitEventParams {
  organizationId: string;
  projectId?: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  version?: number;
  payload: Record<string, unknown>;
}

export async function recordOutboxEvent(
  params: EmitEventParams,
  tx?: Parameters<Parameters<Database['transaction']>[0]>[0]
): Promise<CollaborationEnvelope> {
  const eventId = `evt_${crypto.randomUUID()}`;
  const occurredAt = new Date().toISOString();

  const envelope: CollaborationEnvelope = {
    eventId,
    type: params.eventType,
    organizationId: params.organizationId,
    projectId: params.projectId,
    resourceId: params.aggregateId,
    version: params.version,
    occurredAt,
    payload: params.payload,
  };

  const client = tx || db;

  await client.insert(collaborationEvents).values({
    id: eventId,
    organizationId: params.organizationId,
    aggregateType: params.aggregateType,
    aggregateId: params.aggregateId,
    eventType: params.eventType,
    payload: envelope as unknown as Record<string, unknown>,
    attemptCount: 0,
    publishedAt: null,
  });

  return envelope;
}

export async function publishEvent(envelope: CollaborationEnvelope) {
  try {
    broker.broadcast(envelope);
    // Mark as published in outbox
    await db
      .update(collaborationEvents)
      .set({ publishedAt: new Date() })
      .where(eq(collaborationEvents.id, envelope.eventId));
  } catch (err) {
    console.error('Failed to publish outbox event immediately:', err);
    // Outbox worker will pick it up
  }
}

export async function processOutboxQueue(limit = 50): Promise<number> {
  const pending = await db
    .select()
    .from(collaborationEvents)
    .where(isNull(collaborationEvents.publishedAt))
    .limit(limit);

  let published = 0;
  for (const item of pending) {
    try {
      const envelope = item.payload as unknown as CollaborationEnvelope;
      broker.broadcast(envelope);
      await db
        .update(collaborationEvents)
        .set({
          publishedAt: new Date(),
          attemptCount: item.attemptCount + 1,
        })
        .where(eq(collaborationEvents.id, item.id));
      published++;
    } catch (err) {
      console.error(`Error publishing outbox event ${item.id}:`, err);
      await db
        .update(collaborationEvents)
        .set({
          attemptCount: item.attemptCount + 1,
        })
        .where(eq(collaborationEvents.id, item.id));
    }
  }

  return published;
}

