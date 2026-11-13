/**
 * Pure state transitions for the Kanban board. The hook (use-project-board) owns the React state;
 * every change to the task list goes through one of these functions, so each is unit-testable.
 */
import { computePosition } from '@/shared/fractional-index';
import type { BoardTask } from '@/lib/api/types';
import type { CollaborationEvent } from '@/lib/use-realtime';

/** A card as the board holds it: list rows carry joined assignee fields, other sources may not. */
export type BoardCard = Omit<BoardTask, 'assigneeName' | 'assigneeEmail'> & {
  assigneeName?: string | null;
  assigneeEmail?: string | null;
};

export const TASK_PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'] as const;

/** Cards of one column in display order; ties broken by id, as the server orders them. */
export function columnCards(cards: BoardCard[], statusId: string): BoardCard[] {
  return cards
    .filter((c) => c.statusId === statusId)
    .sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Adds a card, or merges it into the existing one. A version older than the one held is ignored,
 * so a late response or a replayed event can never roll a card back.
 */
export function upsertCard(cards: BoardCard[], incoming: BoardCard): BoardCard[] {
  const index = cards.findIndex((c) => c.id === incoming.id);
  if (index === -1) return [...cards, incoming];
  const current = cards[index];
  if ((incoming.version ?? 0) < (current.version ?? 0)) return cards;
  const next = cards.slice();
  next[index] = { ...current, ...incoming };
  return next;
}

export function removeCard(cards: BoardCard[], taskId: string): BoardCard[] {
  return cards.filter((c) => c.id !== taskId);
}

/** Applies a realtime event for this project; events for other projects leave the list as it is. */
export function applyRealtimeEvent(cards: BoardCard[], event: CollaborationEvent, projectId: string): BoardCard[] {
  if (event.projectId && event.projectId !== projectId) return cards;
  switch (event.type) {
    case 'task.created':
    case 'task.updated':
    case 'task.moved':
      return event.payload.task ? upsertCard(cards, event.payload.task as BoardCard) : cards;
    case 'task.deleted':
      return removeCard(cards, event.payload.taskId as string);
    default:
      return cards;
  }
}

/**
 * Where a card dropped at `index` of a column lands: its neighbours (sent to the server, which
 * re-derives them under a lock) and the position to show until the server answers.
 */
export function dropTarget(cards: BoardCard[], taskId: string, statusId: string, index: number) {
  const column = columnCards(cards, statusId).filter((c) => c.id !== taskId);
  const prev = column[index - 1] ?? null;
  const next = column[index] ?? null;
  const { position } = computePosition(prev?.position, next?.position);
  return { prevTaskId: prev?.id ?? null, nextTaskId: next?.id ?? null, position };
}

/** The last position in a column, for a card moved there without a drop index (keyboard moves). */
export function endOfColumn(cards: BoardCard[], taskId: string, statusId: string) {
  const column = columnCards(cards, statusId).filter((c) => c.id !== taskId);
  return dropTarget(cards, taskId, statusId, column.length);
}

export function filterCards(cards: BoardCard[], filters: { query: string; priority: string }): BoardCard[] {
  const needle = filters.query.trim().toLowerCase();
  return cards.filter(
    (c) =>
      (!needle || c.title.toLowerCase().includes(needle)) &&
      (filters.priority === 'all' || c.priority === filters.priority)
  );
}

/** The column key suggested for a column name: lowercase letters, digits and underscores. */
export function statusKeyFor(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
