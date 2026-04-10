'use client';

import React from 'react';
import { Calendar, User, MessageSquare, AlertCircle, ArrowRight } from 'lucide-react';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    priority: string;
    assigneeName?: string | null;
    dueAt?: string | null;
    version: number;
    statusId: string;
  };
  workflowStatuses?: Array<{ id: string; name: string }>;
  onClick: () => void;
  onMoveToStatus?: (statusId: string) => void;
}

export function TaskCard({ task, workflowStatuses = [], onClick, onMoveToStatus }: TaskCardProps) {
  const isOverdue = task.dueAt ? new Date(task.dueAt) < new Date() : false;

  const priorityBadge = () => {
    switch (task.priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">Low</span>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col gap-2.5 relative"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {task.title}
        </h4>
        <div className="shrink-0">{priorityBadge()}</div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 mt-0.5">
        <div className="flex items-center gap-3">
          {task.assigneeName ? (
            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assigneeName}`}>
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                {task.assigneeName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[80px]">{task.assigneeName}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
          )}

          {task.dueAt && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
              }`}
              title={isOverdue ? 'Overdue' : 'Due date'}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(task.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Keyboard-accessible destination selector */}
        {onMoveToStatus && workflowStatuses.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          >
            <select
              aria-label="Move task to column"
              value={task.statusId}
              onChange={(e) => onMoveToStatus(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
            >
              <option value={task.statusId} disabled>
                Move to...
              </option>
              {workflowStatuses
                .filter((s) => s.id !== task.statusId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

