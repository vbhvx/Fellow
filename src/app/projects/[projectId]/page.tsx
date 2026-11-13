'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Modal, ModalActions } from '@/components/Modal';
import { TaskCard } from '@/features/board/TaskCard';
import { TaskModal } from '@/features/board/TaskModal';
import { useProjectBoard } from '@/features/board/use-project-board';
import { TASK_PRIORITIES, columnCards, filterCards, statusKeyFor } from '@/features/board/board-state';

const priorityLabel = (p: string) => (p === 'none' ? 'No priority' : p.charAt(0).toUpperCase() + p.slice(1));

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
  const projectId = params.projectId as string;
  const board = useProjectBoard(projectId);
  const { project, statuses, members, loading, error } = board;

  // View state: filters and which dialog is open. Server state lives in useProjectBoard.
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(searchParams.get('task'));

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createColumnId, setCreateColumnId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnKey, setNewColumnKey] = useState('');

  const handleDragEnd = ({ destination, source, draggableId }: DropResult) => {
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    void board.moveTask(draggableId, destination.droppableId, destination.index);
  };

  const openCreateTask = (statusId: string) => {
    setCreateColumnId(statusId);
    setShowCreateTaskModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !createColumnId) return;
    const created = await board.createTask({
      title: newTaskTitle.trim(),
      statusId: createColumnId,
      priority: newTaskPriority,
      assigneeId: newTaskAssignee || null,
    });
    if (created) {
      setShowCreateTaskModal(false);
      setNewTaskTitle('');
      setNewTaskAssignee('');
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    if (await board.addColumn({ name: newColumnName, key: newColumnKey })) {
      setShowAddColumnModal(false);
      setNewColumnName('');
      setNewColumnKey('');
    }
  };

  const visibleCards = filterCards(board.cards, { query: searchQuery, priority: filterPriority });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentOrgId={project?.organizationId} realtimeStatus={board.realtimeStatus} />

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
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </select>

            {/* Add Task Button */}
            <button
              onClick={() => openCreateTask((statuses.find((s) => s.isDefault) ?? statuses[0])?.id || '')}
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
          <ErrorAlert message={error} onDismiss={board.clearError} />
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
                const columnTasks = columnCards(visibleCards, status.id);

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
                        onClick={() => openCreateTask(status.id)}
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
                                    onMoveToStatus={(destId) => void board.moveTask(task.id, destId)}
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
          workflowStatuses={statuses}
          projectMembers={members}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={board.reload}
          onTaskDeleted={board.forgetTask}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <Modal title="Create New Task" onClose={() => setShowCreateTaskModal(false)}>
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
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
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

              <ModalActions onCancel={() => setShowCreateTaskModal(false)} submitLabel="Create Task" />
            </form>
        </Modal>
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <Modal title="Add Workflow Column" size="sm" onClose={() => setShowAddColumnModal(false)}>
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
                      setNewColumnKey(statusKeyFor(e.target.value));
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

              <ModalActions onCancel={() => setShowAddColumnModal(false)} submitLabel="Add Column" />
            </form>
        </Modal>
      )}
    </div>
  );
}
