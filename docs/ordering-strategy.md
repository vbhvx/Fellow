# Fractional Indexing & Deterministic Reordering Strategy

## Motivation

Drag-and-drop task ordering is a foundational requirement in collaborative Kanban platforms. Traditional integer-based approaches require updating every subsequent row in the column on each drag operation, causing write amplification, database locking, and high conflict rates during concurrent moves.

Fellow implements a **Deterministic Fractional Indexing with Automatic Rebalance** strategy.

## Position Computation Algorithm

Tasks maintain a `position` field stored as a `DOUBLE PRECISION` float.

When a task is dragged between two neighboring tasks (`prevTask` and `nextTask`):

```text
       [prevTask]  (position: 1000.0)
            │
            ▼
       [draggedTask] -> Midpoint: (1000.0 + 2000.0) / 2.0 = 1500.0
            │
            ▲
       [nextTask]  (position: 2000.0)
```

### Boundary Scenarios:

1. **First item in an empty column:**
   $$\text{position} = 1000.0$$
2. **Placed at the top of the column (before the first item):**
   - If $\text{nextPosition} > 1.0$: $\text{position} = \max(\text{nextPosition} - 1000.0, \text{nextPosition} / 2.0)$
   - If $\text{nextPosition} \le 1.0$: $\text{position} = \text{nextPosition} / 2.0$
3. **Placed at the end of the column (after the last item):**
   $$\text{position} = \text{prevPosition} + 1000.0$$
4. **Placed between two items:**
   $$\text{position} = \frac{\text{prevPosition} + \text{nextPosition}}{2}$$

## Gap Compression & Automatic Rebalancing

Repeated insertions at the same position can halve floating point precision over time:
```text
Step 0:  1000.0  ...  2000.0   (gap: 1000)
Step 1:  1000.0  ...  1500.0   (gap: 500)
Step 20: 1000.0  ...  1000.00095
```

### Rebalance Trigger
If the distance between neighbors satisfies:
$$|\text{nextPosition} - \text{prevPosition}| < 0.0001$$
or if neighbors have identical positions due to concurrent insertion, `needsRebalance` is flagged as `true`.

### Rebalance Execution
Inside the atomic move transaction:
1. All active tasks in the destination column are retrieved ordered by position.
2. The moved task is inserted into the sequence at its designated slot.
3. Every task in the column is reassigned an evenly distributed position:
   $$\text{position}_i = (i + 1) \times 1000.0$$
4. All tasks are updated in batch within the transaction.

## Concurrent Move Safety & Versioning

To prevent stale client snapshots from overwriting moves:
- The move endpoint `/api/v1/tasks/:taskId/move` accepts `expectedVersion`.
- If another user modified the task (status, description, priority, or position) concurrently, the server detects that `task.version !== expectedVersion` and rejects the operation with `409 Conflict`.
- The frontend catches this conflict, rolls back the optimistic drag movement, and re-synchronizes the column with canonical server data.

