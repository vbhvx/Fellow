import { describe, it, expect } from 'vitest';
import {
  computePosition,
  rebalancePositions,
  INITIAL_POSITION,
  POSITION_STEP,
  MIN_POSITION_GAP,
} from '@/server/ordering/fractional-index';

describe('Fractional Indexing & Deterministic Task Reordering', () => {
  it('assigns initial position for first item in empty column', () => {
    const { position, needsRebalance } = computePosition(null, null);
    expect(position).toBe(INITIAL_POSITION);
    expect(needsRebalance).toBe(false);
  });

  it('calculates position when placing item at the start of column', () => {
    const { position, needsRebalance } = computePosition(null, 2000.0);
    expect(position).toBe(1000.0);
    expect(needsRebalance).toBe(false);
  });

  it('calculates position when inserting at the end of column', () => {
    const { position, needsRebalance } = computePosition(2000.0, null);
    expect(position).toBe(3000.0);
    expect(needsRebalance).toBe(false);
  });

  it('calculates midpoint position when inserting between two items', () => {
    const { position, needsRebalance } = computePosition(1000.0, 2000.0);
    expect(position).toBe(1500.0);
    expect(needsRebalance).toBe(false);

    // Second insertion
    const second = computePosition(1000.0, 1500.0);
    expect(second.position).toBe(1250.0);
    expect(second.needsRebalance).toBe(false);
  });

  it('detects compressed gap and triggers rebalance requirement', () => {
    // Highly compressed positions
    const posA = 1000.0;
    const posB = 1000.0 + MIN_POSITION_GAP / 2;

    const { needsRebalance } = computePosition(posA, posB);
    expect(needsRebalance).toBe(true);
  });

  it('triggers rebalance if neighbors are unordered or identical', () => {
    const { needsRebalance } = computePosition(2000.0, 2000.0);
    expect(needsRebalance).toBe(true);

    const inverted = computePosition(3000.0, 2000.0);
    expect(inverted.needsRebalance).toBe(true);
  });

  it('rebalances positions evenly across column items', () => {
    const taskIds = ['task_1', 'task_2', 'task_3', 'task_4'];
    const rebalanced = rebalancePositions(taskIds);

    expect(rebalanced).toHaveLength(4);
    expect(rebalanced[0]).toEqual({ id: 'task_1', position: 1000.0 });
    expect(rebalanced[1]).toEqual({ id: 'task_2', position: 2000.0 });
    expect(rebalanced[2]).toEqual({ id: 'task_3', position: 3000.0 });
    expect(rebalanced[3]).toEqual({ id: 'task_4', position: 4000.0 });
  });
});

