'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api/client';
import { projectsApi, tasksApi } from '@/lib/api/endpoints';
import type { Project, ProjectMember, WorkflowStatus } from '@/lib/api/types';
import { useRealtime, type CollaborationEvent } from '@/lib/use-realtime';
import {
  applyRealtimeEvent,
  dropTarget,
  endOfColumn,
  removeCard,
  statusKeyFor,
  upsertCard,
  type BoardCard,
} from './board-state';

/**
 * Server state of one project board: the project, its columns, cards and members, kept in sync
 * by realtime events. Moves are optimistic and roll back on failure; every list change goes
 * through board-state.ts. Pages render what this returns and call its actions.
 */
export function useProjectBoard(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The latest list, for computing a move without waiting for a render.
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s, t, m] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.statuses(projectId),
        projectsApi.tasks(projectId),
        projectsApi.members(projectId),
      ]);
      setProject(p);
      setStatuses(s);
      setCards(t);
      setMembers(m);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load project board'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onEvent = useCallback(
    (event: CollaborationEvent) => setCards((prev) => applyRealtimeEvent(prev, event, projectId)),
    [projectId]
  );
  const { status: realtimeStatus } = useRealtime(project?.organizationId, onEvent, reload);

  /** Moves a card; `index` is its slot in the destination column, or the end when omitted. */
  const moveTask = useCallback(async (taskId: string, statusId: string, index?: number) => {
    const before = cardsRef.current;
    const card = before.find((c) => c.id === taskId);
    if (!card) return;

    const target = index === undefined ? endOfColumn(before, taskId, statusId) : dropTarget(before, taskId, statusId, index);
    setCards((prev) => prev.map((c) => (c.id === taskId ? { ...c, statusId, position: target.position } : c)));

    try {
      const moved = await tasksApi.move(taskId, {
        statusId,
        prevTaskId: target.prevTaskId,
        nextTaskId: target.nextTaskId,
        expectedVersion: card.version,
      });
      setCards((prev) => upsertCard(prev, moved));
    } catch (err) {
      setCards(before);
      setError(`Move failed: ${errorMessage(err)} The board was restored.`);
    }
  }, []);

  /** Creates a card; resolves true on success so the form can close. */
  const createTask = useCallback(
    async (input: { title: string; statusId: string; priority: string; assigneeId: string | null }) => {
      try {
        const task = await projectsApi.createTask(projectId, input);
        // The realtime event for this task may already have added it: upsert, never append.
        setCards((prev) => upsertCard(prev, task));
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      }
    },
    [projectId]
  );

  const addColumn = useCallback(
    async (input: { name: string; key: string }) => {
      try {
        const status = await projectsApi.createStatus(projectId, {
          name: input.name.trim(),
          key: input.key.trim() || statusKeyFor(input.name),
          category: 'started',
        });
        setStatuses((prev) => (prev.some((s) => s.id === status.id) ? prev : [...prev, status]));
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      }
    },
    [projectId]
  );

  const forgetTask = useCallback((taskId: string) => setCards((prev) => removeCard(prev, taskId)), []);

  return {
    project,
    statuses,
    cards,
    members,
    loading,
    error,
    clearError: () => setError(null),
    realtimeStatus,
    reload,
    moveTask,
    createTask,
    addColumn,
    forgetTask,
  };
}
