'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, History, MessageSquare, Trash2, Save } from 'lucide-react';
import { errorMessage, isConflict } from '@/lib/api/client';
import { tasksApi } from '@/lib/api/endpoints';
import type { Comment, ProjectMember, TaskActivity, TaskDetail, WorkflowStatus } from '@/lib/api/types';
import { TASK_PRIORITIES } from './board-state';

interface TaskModalProps {
  taskId: string;
  workflowStatuses: WorkflowStatus[];
  projectMembers: ProjectMember[];
  onClose: () => void;
  /** Called after a save, so the board can pick up fields its realtime events do not carry. */
  onTaskUpdated?: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

const priorityLabel = (p: string) => (p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1));

export function TaskModal({
  taskId,
  workflowStatuses,
  projectMembers,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskModalProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string>('');

  // Tabs: 'details' | 'activity'
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activities, setActivities] = useState<TaskActivity[]>([]);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const t = await tasksApi.get(taskId);
      setTask(t);
      setTitle(t.title);
      setDescription(t.description || '');
      setStatusId(t.statusId);
      setPriority(t.priority);
      setAssigneeId(t.assigneeId || '');
      setDueAt(t.dueAt ? t.dueAt.substring(0, 10) : '');

      // Load comments & activities
      const [c, a] = await Promise.all([tasksApi.comments(taskId), tasksApi.activity(taskId)]);
      setComments(c);
      setActivities(a);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load the task'));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    setError(null);
    setConflictError(null);
    try {
      await tasksApi.update(taskId, {
        title,
        description: description || null,
        statusId,
        priority,
        assigneeId: assigneeId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        version: task.version, // the server rejects the save if someone else changed the task first
      });

      onTaskUpdated?.();
      await loadTask();
    } catch (err) {
      if (isConflict(err)) {
        setConflictError(
          'This task was modified by another collaborator while you were editing. Please reload to see the latest changes.'
        );
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const comment = await tasksApi.addComment(taskId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      setActivities(await tasksApi.activity(taskId));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksApi.remove(taskId);
      onTaskDeleted?.(taskId);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              v{task?.version || 1}
            </span>
            <div className="flex gap-2 border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'details' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Task Details
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Timeline ({activities.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conflict Warning Banner */}
        {conflictError && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center justify-between text-amber-800 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{conflictError}</span>
            </div>
            <button
              onClick={loadTask}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Reload Latest
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 text-rose-700 text-sm flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading task details...</div>
          ) : activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-lg font-bold text-slate-900 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Status, Priority, Assignee, Due Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
                  <select
                    value={statusId}
                    onChange={(e) => setStatusId(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none"
                  >
                    {workflowStatuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none capitalize"
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Assignee</label>
                  <select
                    value={assigneeId || ''}
                    onChange={(e) => setAssigneeId(e.target.value || null)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add detailed task context, acceptance criteria, or technical notes..."
                  className="w-full text-sm text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Save changes button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Comments Section */}
              <div className="pt-6 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Discussion & Comments ({comments.length})</span>
                </h4>

                <div className="space-y-3 mb-4">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No comments yet. Start the discussion below.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-slate-900">{c.authorName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Audit Activity Timeline Tab */
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Audit History & Timeline</h4>
              <p className="text-xs text-slate-500 mb-4">
                Chronological record of status changes, moves, reassignments, and modifications.
              </p>

              <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-200">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-4 relative pl-8 text-xs">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">
                          {act.actorName || 'System'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 capitalize">
                        Event: <span className="font-medium text-slate-800">{act.eventType.replaceAll('_', ' ')}</span>
                      </p>
                      {act.previousValue && act.newValue && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Changed from <span className="font-mono bg-white px-1 rounded">{act.previousValue}</span> to{' '}
                          <span className="font-mono bg-white px-1 rounded">{act.newValue}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

