import { describe, it, expect } from 'vitest';
import { nextCompletedAt } from '@/server/services/task.service';

describe('nextCompletedAt', () => {
  const doneAt = new Date('2026-01-01T00:00:00Z');

  it('dates a task when it first enters a completed column', () => {
    expect(nextCompletedAt(null, 'completed')).toBeInstanceOf(Date);
  });

  it('keeps the original date while the task stays completed (reordering in Done)', () => {
    expect(nextCompletedAt(doneAt, 'completed')).toBe(doneAt);
  });

  it('clears the date when the task leaves completed columns, and leaves open tasks alone', () => {
    expect(nextCompletedAt(doneAt, 'started')).toBeNull();
    expect(nextCompletedAt(null, 'started')).toBeUndefined();
  });
});
