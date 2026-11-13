import { describe, it, expect } from 'vitest';
import {
  applyRealtimeEvent,
  columnCards,
  dropTarget,
  endOfColumn,
  filterCards,
  statusKeyFor,
  upsertCard,
  type BoardCard,
} from '@/features/board/board-state';
import { computePosition } from '@/shared/fractional-index';
import type { CollaborationEvent } from '@/lib/use-realtime';

const card = (id: string, statusId: string, position: number, extra: Partial<BoardCard> = {}): BoardCard =>
  ({ id, statusId, position, version: 1, title: id, priority: 'medium', projectId: 'p1', ...extra }) as BoardCard;

const event = (type: string, payload: Record<string, unknown>, projectId = 'p1'): CollaborationEvent => ({
  eventId: `evt_${type}`,
  seq: 1,
  type,
  organizationId: 'o1',
  projectId,
  resourceId: 'x',
  occurredAt: new Date(0).toISOString(),
  payload,
});

describe('board state', () => {
  it('orders a column by position, then id, like the server', () => {
    const cards = [card('b', 's', 2000), card('c', 's', 1000), card('a', 's', 2000), card('z', 'other', 1)];
    expect(columnCards(cards, 's').map((c) => c.id)).toEqual(['c', 'a', 'b']);
  });

  describe('upsertCard', () => {
    it('adds a card only once, whichever of the create response and its event arrives first', () => {
      const created = card('t1', 's', 1000);
      const afterEvent = applyRealtimeEvent([], event('task.created', { task: created }), 'p1');
      const afterResponse = upsertCard(afterEvent, created);
      expect(afterResponse).toHaveLength(1);
    });

    it('never rolls a card back to an older version', () => {
      const cards = [card('t1', 'done', 3000, { version: 4 })];
      const stale = card('t1', 'todo', 1000, { version: 3 });
      expect(upsertCard(cards, stale)).toBe(cards);
    });

    it('merges a newer version and keeps fields the update lacks', () => {
      const cards = [card('t1', 's', 1000, { version: 1, assigneeName: 'Ada' })];
      const [merged] = upsertCard(cards, card('t1', 's2', 5000, { version: 2, assigneeName: undefined }));
      expect(merged.statusId).toBe('s2');
      expect(merged.version).toBe(2);
    });
  });

  describe('applyRealtimeEvent', () => {
    it('ignores events for other projects', () => {
      const cards = [card('t1', 's', 1000)];
      expect(applyRealtimeEvent(cards, event('task.deleted', { taskId: 't1' }, 'p2'), 'p1')).toBe(cards);
    });

    it('removes deleted tasks and ignores unrelated event types', () => {
      const cards = [card('t1', 's', 1000), card('t2', 's', 2000)];
      expect(applyRealtimeEvent(cards, event('task.deleted', { taskId: 't1' }), 'p1').map((c) => c.id)).toEqual(['t2']);
      expect(applyRealtimeEvent(cards, event('comment.created', {}), 'p1')).toBe(cards);
    });
  });

  describe('drop placement', () => {
    const cards = [card('a', 's', 1000), card('b', 's', 2000), card('c', 's', 3000), card('m', 'other', 1000)];

    it('sends the neighbours at the drop index and previews the server position', () => {
      const t = dropTarget(cards, 'm', 's', 1);
      expect(t).toMatchObject({ prevTaskId: 'a', nextTaskId: 'b' });
      expect(t.position).toBe(computePosition(1000, 2000).position);
    });

    it('previews a drop at the top exactly as the server places it', () => {
      expect(dropTarget(cards, 'm', 's', 0).position).toBe(computePosition(null, 1000).position);
    });

    it('excludes the moved card from its own neighbours within a column', () => {
      expect(dropTarget(cards, 'a', 's', 2)).toMatchObject({ prevTaskId: 'c', nextTaskId: null });
    });

    it('appends at the end for a move without an index', () => {
      expect(endOfColumn(cards, 'm', 's')).toMatchObject({ prevTaskId: 'c', nextTaskId: null, position: 4000 });
    });
  });

  it('filters by title and priority', () => {
    const cards = [card('Fix login', 's', 1, { priority: 'urgent' }), card('Write docs', 's', 2, { priority: 'low' })];
    expect(filterCards(cards, { query: 'LOGIN', priority: 'all' }).map((c) => c.id)).toEqual(['Fix login']);
    expect(filterCards(cards, { query: '', priority: 'low' }).map((c) => c.id)).toEqual(['Write docs']);
  });

  it('suggests a column key from a name', () => {
    expect(statusKeyFor(' QA Review! ')).toBe('qa_review_');
  });
});
