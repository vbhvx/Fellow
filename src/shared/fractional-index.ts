// Fractional ordering of cards within a column. Shared: the server computes the canonical
// position, and the board uses the same rule to place a dropped card before the server replies.

export const INITIAL_POSITION = 1000.0;
export const POSITION_STEP = 1000.0;
export const MIN_POSITION_GAP = 0.0001;

export function computePosition(
  prevPosition: number | null | undefined,
  nextPosition: number | null | undefined
): { position: number; needsRebalance: boolean } {
  // Case 1: First item in empty column
  if (prevPosition == null && nextPosition == null) {
    return { position: INITIAL_POSITION, needsRebalance: false };
  }

  // Case 2: Moving to the start of the list (before the first item)
  if (prevPosition == null && nextPosition != null) {
    if (nextPosition > 1.0) {
      const pos = nextPosition - POSITION_STEP;
      if (pos > 0) {
        return { position: pos, needsRebalance: false };
      }
    }
    const pos = nextPosition / 2.0;
    return {
      position: pos,
      needsRebalance: pos < MIN_POSITION_GAP,
    };
  }

  // Case 3: Moving to the end of the list (after the last item)
  if (prevPosition != null && nextPosition == null) {
    return {
      position: prevPosition + POSITION_STEP,
      needsRebalance: false,
    };
  }

  // Case 4: Inserting between two items
  if (prevPosition != null && nextPosition != null) {
    if (prevPosition >= nextPosition) {
      // Unordered or identical neighbors detected - rebalance triggered
      return {
        position: prevPosition + 0.5,
        needsRebalance: true,
      };
    }

    const gap = nextPosition - prevPosition;
    const pos = (prevPosition + nextPosition) / 2.0;

    return {
      position: pos,
      needsRebalance: gap < MIN_POSITION_GAP,
    };
  }

  return { position: INITIAL_POSITION, needsRebalance: false };
}

export function rebalancePositions(
  taskIds: string[]
): Array<{ id: string; position: number }> {
  return taskIds.map((id, index) => ({
    id,
    position: (index + 1) * POSITION_STEP,
  }));
}

