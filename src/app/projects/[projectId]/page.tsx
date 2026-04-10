'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Plus,
  Filter,
  Search,
  Users,
  Settings,
  AlertCircle,
  Wifi,
  WifiOff,
  SlidersHorizontal,
  FolderKanban,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { useRealtime, CollaborationEvent } from '@/lib/use-realtime';
import { apiRequest } from '@/lib/api-client';

interface TaskItem {
  id: string;
  organizationId: string;
  projectId: string;
  statusId: string;
  title: string;
  description?: string | null;
  priority: string;
  createdBy: string;
  assigneeId?: string | null;
  dueAt?: string | null;
  position: number;
  version: number;
  assigneeName?: string | null;
}

interface WorkflowStatusItem {
  id: string;
  name: string;
  key: string;
  category: string;
  position: number;
}

export default function ProjectBoardPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading Kanban Board...</div>}>
      <ProjectBoardContent />
    </React.Suspense>
  );
}

function ProjectBoardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [statuses, setStatuses] = useState<WorkflowStatusItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Modal states
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(searchParams.get('task') || null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // Add column modal
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnKey, setNewColumnKey] = useState('');

  // Initial data loading
  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projRes, statRes, taskRes, memRes] = await Promise.all([
        apiRequest(`/api/v1/projects/${projectId}`),
        apiRequest(`/api/v1/projects/${projectId}/statuses`),
        apiRequest(`/api/v1/projects/${projectId}/tasks`),
        apiRequest(`/api/v1/projects/${projectId}/members`),
      ]);

      setProject(projRes.project);
      setStatuses(statRes.statuses || []);
      setTasks(taskRes.tasks || []);
      setMembers(memRes.members || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load project board');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Real-time Event Handling
  const handleRealtimeEvent = useCallback(
    (event: CollaborationEvent) => {
      if (event.projectId && event.projectId !== projectId) {
        return;
      }

      if (event.type === 'task.created') {
        const newTask = event.payload.task as TaskItem;
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [...prev, newTask];
        });
      } else if (event.type === 'task.updated' || event.type === 'task.moved') {
        const updated = event.payload.task as TaskItem;
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      } else if (event.type === 'task.deleted') {
        const delId = event.payload.taskId;
        setTasks((prev) => prev.filter((t) => t.id !== delId));
      }
    },
    [projectId]
  );

  const { status: realtimeStatus } = useRealtime(project?.organizationId, handleRealtimeEvent);

  // Drag and drop handler with optimistic UI updates
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const taskBeingMoved = tasks.find((t) => t.id === draggableId);
    if (!taskBeingMoved) return;

    // Snapshot original tasks for potential rollback
    const originalTasks = [...tasks];

    // Optimistically update tasks in state
    const destStatusId = destination.droppableId;
    const destColumnTasks = tasks
      .filter((t) => t.statusId === destStatusId && t.id !== draggableId)
      .sort((a, b) => a.position - b.position);

    // Identify neighbors
    const prevTask = destColumnTasks[destination.index - 1] || null;
    const nextTask = destColumnTasks[destination.index] || null;

    // Estimate new position for instant visual rendering
    let estimatedPos = 1000.0;
    if (prevTask && nextTask) estimatedPos = (prevTask.position + nextTask.position) / 2.0;
    else if (prevTask) estimatedPos = prevTask.position + 1000.0;
    else if (nextTask) estimatedPos = nextTask.position / 2.0;

    const optimisticallyUpdated = tasks.map((t) => {
      if (t.id === draggableId) {
        return {
          ...t,
          statusId: destStatusId,
          position: estimatedPos,
        };
      }
      return t;
    });

    setTasks(optimisticallyUpdated);

    try {
      const moveRes = await apiRequest(`/api/v1/tasks/${draggableId}/move`, {
        method: 'POST',
        body: JSON.stringify({
          statusId: destStatusId,
          prevTaskId: prevTask?.id || null,
          nextTaskId: nextTask?.id || null,
          expectedVersion: taskBeingMoved.version,
        }),
      });

      // Update with server confirmed version & canonical position
      const canonicalTask = moveRes.task;
      setTasks((prev) => prev.map((t) => (t.id === canonicalTask.id ? { ...t, ...canonicalTask } : t)));
    } catch (err: any) {
      // Rollback on conflict or failure!
      console.error('Task move failed:', err);
      setError(`Move failed: ${err.message}. Reconciling board state.`);
      setTasks(originalTasks);
    }
  };

  // Keyboard accessibility move handler
  const handleKeyboardMove = async (taskId: string, targetStatusId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const original = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, statusId: targetStatusId } : t)));

    try {
      const res = await apiRequest(`/api/v1/tasks/${taskId}/move`, {
        method: 'POST',
        body: JSON.stringify({
          statusId: targetStatusId,
          expectedVersion: task.version,
        }),
      });
      setTasks((prev) => prev.map((t) => (t.id === res.task.id ? { ...t, ...res.task } : t)));
    } catch (err: any) {
      setError(`Move failed: ${err.message}`);
      setTasks(original);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !createColumnId) return;

    try {
      const res = await apiRequest(`/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          statusId: createColumnId,
          priority: newTaskPriority,
          assigneeId: newTaskAssignee || null,
        }),
      });

      setTasks((prev) => [...prev, res.task]);
      setShowCreateTaskModal(false);
      setNewTaskTitle('');
      setNewTaskAssignee('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    const key = newColumnKey.trim() || newColumnName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    try {
      const res = await apiRequest(`/api/v1/projects/${projectId}/statuses`, {
        method: 'POST',
        body: JSON.stringify({
          name: newColumnName.trim(),
          key,
          category: 'started',
        }),
      });

      setStatuses((prev) => [...prev, res.status]);
      setShowAddColumnModal(false);
      setNewColumnName('');
      setNewColumnKey('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterPriority !== 'all' && t.priority !== filterPriority) {
      return false;
    }
    if (filterAssignee !== 'all' && t.assigneeId !== filterAssignee) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentOrgId={project?.organizationId} realtimeStatus={realtimeStatus} />

      {/* Board Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{project?.name || 'Project Board'}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">
                  {project?.visibility || 'organization'}
                </span>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">
                  Role: {project?.myRole || 'Member'}
                </span>
              </div>
              {project?.description && (
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl line-clamp-1">{project.description}</p>
              )}
            </div>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
              />
            </div>

            {/* Priority Filter */}
            <select
              aria-label="Filter by priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none capitalize"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Add Task Button */}
            <button
              onClick={() => {
                setCreateColumnId(statuses[0]?.id || '');
                setShowCreateTaskModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>

            {/* Add Column Button */}
            <button
              onClick={() => setShowAddColumnModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              title="Add Workflow Status Column"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Add Column</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Loading Kanban Board...
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex items-start gap-4 min-w-max pb-6">
              {statuses.map((status) => {
                const columnTasks = filteredTasks
                  .filter((t) => t.statusId === status.id)
                  .sort((a, b) => a.position - b.position);

                return (
                  <div
                    key={status.id}
                    className="w-80 bg-slate-100/80 rounded-2xl p-3 border border-slate-200 flex flex-col max-h-[calc(100vh-180px)]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-2 py-1 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {status.name}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
                          {columnTasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setCreateColumnId(status.id);
                          setShowCreateTaskModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                        title={`Add task to ${status.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Droppable Task List */}
                    <Droppable droppableId={status.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto space-y-2.5 p-1 rounded-xl transition-colors ${
                            snapshot.isDraggingOver ? 'bg-indigo-50/60 ring-2 ring-indigo-400/40' : ''
                          }`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={dragSnapshot.isDragging ? 'opacity-90 shadow-2xl scale-[1.02]' : ''}
                                >
                                  <TaskCard
                                    task={task}
                                    workflowStatuses={statuses}
                                    onClick={() => setSelectedTaskId(task.id)}
                                    onMoveToStatus={(destId) => handleKeyboardMove(task.id, destId)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                              No tasks in this column
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          projectId={projectId}
          workflowStatuses={statuses}
          projectMembers={members}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={loadProjectData}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Implement security tests for tenant boundary"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Column</label>
                  <select
                    value={createColumnId}
                    onChange={(e) => setCreateColumnId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none capitalize"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assignee (Optional)</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Workflow Column</h3>
            <form onSubmit={handleAddColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Column Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={newColumnName}
                  onChange={(e) => {
                    setNewColumnName(e.target.value);
                    if (!newColumnKey) {
                      setNewColumnKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    }
                  }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Column Key (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. qa_review"
                  value={newColumnKey}
                  onChange={(e) => setNewColumnKey(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddColumnModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
