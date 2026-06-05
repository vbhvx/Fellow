'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  Shield,
  Users,
  Search,
  Lock,
  Globe,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { apiRequest } from '@/lib/api-client';

interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  myRole: string;
  createdAt: string;
}

interface AssignedTask {
  id: string;
  projectId: string;
  title: string;
  priority: string;
  dueAt?: string | null;
  updatedAt: string;
}

export default function DashboardPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading Dashboard...</div>}>
      <DashboardContent />
    </React.Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectVisibility, setNewProjectVisibility] = useState('organization');
  const [creatingProject, setCreatingProject] = useState(false);

  const loadDashboardData = useCallback(async (orgId?: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get user organizations if orgId not specified
      let activeOrg = orgId;
      if (!activeOrg) {
        const orgsRes = await apiRequest('/api/v1/organizations');
        const orgList = orgsRes.organizations || [];
        if (orgList.length === 0) {
          router.push('/organizations/new');
          return;
        }
        activeOrg = orgList[0].id;
      }
      setCurrentOrgId(activeOrg || null);

      // 2. Fetch accessible projects for this organization
      const projRes = await apiRequest(`/api/v1/organizations/${activeOrg}/projects`);
      setProjects(projRes.projects || []);

      // 3. Fetch user's assigned tasks across accessible projects
      const searchRes = await apiRequest(`/api/v1/search?organizationId=${activeOrg}&q=%`);
      setAssignedTasks(searchRes.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const orgParam = searchParams.get('org');
    loadDashboardData(orgParam || undefined);
  }, [searchParams, loadDashboardData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !currentOrgId) return;

    setCreatingProject(true);
    try {
      const res = await apiRequest(`/api/v1/organizations/${currentOrgId}/projects`, {
        method: 'POST',
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || null,
          visibility: newProjectVisibility,
        }),
      });

      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      router.push(`/projects/${res.project.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const overdueTasks = assignedTasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
  const upcomingTasks = assignedTasks.filter((t) => t.dueAt && new Date(t.dueAt) >= new Date());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentOrgId={currentOrgId || undefined}
        onOrgChange={(orgId) => {
          setCurrentOrgId(orgId);
          loadDashboardData(orgId);
        }}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Organization Workspace</h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1">
              Secure multi-tenant collaboration platform with fine-grained RBAC and real-time synchronization.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold text-rose-500 hover:text-rose-700">
              ✕
            </button>
          </div>
        )}

        {/* Overview Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accessible Projects</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{projects.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tasks</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{assignedTasks.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Soon</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{upcomingTasks.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Work</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{overdueTasks.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Projects</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
              <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No projects yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Create a project to start organizing tasks on configurable Kanban boards.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {proj.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {proj.visibility === 'private' ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Globe className="w-3 h-3" /> Org Visible
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="capitalize font-medium text-slate-600">Role: {proj.myRole}</span>
                    <span className="flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Open Board <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Assigned & Overdue Work Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue / High Priority Work */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Needs Attention ({overdueTasks.length})</span>
            </h3>

            {overdueTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No overdue work in accessible projects.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {overdueTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={`/projects/${t.projectId}?task=${t.id}`}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <span className="text-[10px] text-rose-600 font-medium">
                        Due: {new Date(t.dueAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-bold capitalize">
                      {t.priority}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recently Updated Work */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Recently Updated Work</span>
            </h3>

            {assignedTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No recent task updates recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {assignedTasks.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={`/projects/${t.projectId}?task=${t.id}`}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <span className="text-[10px] text-slate-400">
                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-indigo-600 font-semibold">View →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Mobile App Redesign"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of goals and objectives..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Visibility</label>
                <select
                  value={newProjectVisibility}
                  onChange={(e) => setNewProjectVisibility(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none"
                >
                  <option value="organization">Organization-Visible (All eligible members)</option>
                  <option value="private">Private (Explicit project members & admins only)</option>
                  <option value="guest">Guest-Accessible (Designated guests & members)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
