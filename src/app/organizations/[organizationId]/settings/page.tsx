'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  UserPlus,
  Shield,
  Trash2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { apiRequest } from '@/lib/api-client';

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.organizationId as string;

  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgRes, memRes] = await Promise.all([
        apiRequest(`/api/v1/organizations/${organizationId}`),
        apiRequest(`/api/v1/organizations/${organizationId}/members`),
      ]);
      setOrg(orgRes.organization);
      setMembers(memRes.members || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    try {
      const res = await apiRequest(`/api/v1/organizations/${organizationId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      setGeneratedToken(res.token);
      setInviteEmail('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this organization?`)) return;

    try {
      await apiRequest(`/api/v1/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      });
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToken = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentOrgId={organizationId} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage organization configuration, access policies, and teammates.</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-700 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Organization Overview Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Workspace Profile</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Organization Name</span>
              <span className="font-semibold text-slate-900 text-sm">{org?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Slug</span>
              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                {org?.slug}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Your Role</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded capitalize">
                {org?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Members Management Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Team Members ({members.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Teammates can collaborate across projects permitted by role and visibility rules.
              </p>
            </div>
            {['owner', 'admin'].includes(org?.role) && (
              <button
                onClick={() => {
                  setGeneratedToken(null);
                  setShowInviteModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Teammate</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">{m.name}</span>
                    <span className="text-slate-400 text-[11px]">{m.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-0.5 rounded font-semibold capitalize ${
                      m.role === 'owner'
                        ? 'bg-purple-100 text-purple-700'
                        : m.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : m.role === 'member'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {m.role}
                  </span>

                  {['owner', 'admin'].includes(org?.role) && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.userId, m.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Invite New Teammate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Send an invitation to join this organization with specified permissions.
            </p>

            {generatedToken ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs">
                  <p className="font-semibold mb-1">Invitation Created Successfully!</p>
                  <p className="text-[11px] text-emerald-700 mb-2">
                    Share this invitation token with your teammate so they can accept and join.
                  </p>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-300">
                    <span className="font-mono text-[10px] truncate flex-1 text-slate-700">{generatedToken}</span>
                    <button
                      onClick={copyToken}
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Organization Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none capitalize"
                  >
                    <option value="admin">Admin (Manage members & projects)</option>
                    <option value="member">Member (Create and manage permitted tasks)</option>
                    <option value="viewer">Viewer (Read-only access)</option>
                    <option value="guest">Guest (Explicit project access only)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {inviting ? 'Generating...' : 'Create Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

