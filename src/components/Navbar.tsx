'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, Building2, LogOut, Settings, BookOpen, Wifi, WifiOff } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { authApi, notificationsApi, organizationsApi, searchApi } from '@/lib/api/endpoints';
import type { Notification, Organization, SearchResults, User } from '@/lib/api/types';
import type { RealtimeStatus } from '@/lib/use-realtime';

interface NavbarProps {
  currentOrgId?: string;
  /** Only pages that subscribe to realtime pass this; without it the live indicator is hidden. */
  realtimeStatus?: RealtimeStatus;
}

const NO_RESULTS: SearchResults = { projects: [], tasks: [] };

export function Navbar({ currentOrgId, realtimeStatus }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>(NO_RESULTS);
  const [searching, setSearching] = useState(false);
  // Each keystroke searches; only the newest request may write results.
  const searchSeq = useRef(0);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      // Only a missing session means "sign in again"; a network blip should not log the user out.
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) router.push('/login');
      });
    // The switcher is optional chrome: without it the page still works.
    organizationsApi.list().then(setOrganizations, () => setOrganizations([]));
  }, [router]);

  useEffect(() => {
    if (!currentOrgId) return;
    notificationsApi.list(currentOrgId).then(setNotifications, () => setNotifications([]));
  }, [currentOrgId]);

  // ⌘K / Ctrl+K opens search and Escape closes it, as the hints in the bar say.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      } else if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleLogout = async () => {
    // The cookie is httpOnly; if the request fails the session stays, so only leave on success.
    try {
      await authApi.logout();
      router.push('/login');
    } catch {
      window.alert('Could not sign out. Check your connection and try again.');
    }
  };

  const markAllRead = async () => {
    if (!currentOrgId) return;
    try {
      await notificationsApi.markAllRead(currentOrgId);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      // Leave them unread; the badge stays accurate and the user can retry.
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    const seq = ++searchSeq.current;
    if (!q.trim() || !currentOrgId) {
      setSearchResults(NO_RESULTS);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const results = await searchApi.search({ organizationId: currentOrgId, q });
      if (seq === searchSeq.current) setSearchResults(results);
    } catch {
      if (seq === searchSeq.current) setSearchResults(NO_RESULTS);
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Org Switcher */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              F
            </div>
            <span className="font-bold text-slate-900 text-lg hidden sm:inline tracking-tight">Fellow</span>
          </Link>

          {/* Org Selector */}
          {organizations.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm">
              <Building2 className="w-4 h-4 text-slate-500" />
              <select
                aria-label="Select Organization"
                value={currentOrgId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__new__') {
                    router.push('/organizations/new');
                  } else {
                    router.push(`/dashboard?org=${val}`);
                  }
                }}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer text-sm"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.role})
                  </option>
                ))}
                <option value="__new__">+ New Organization...</option>
              </select>
            </div>
          )}
        </div>

        {/* Center: Search Trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-sm text-slate-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search projects and tasks...</span>
            </div>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Live Status Indicator */}
          {realtimeStatus && (
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                realtimeStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : realtimeStatus === 'connecting'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={`Real-time Stream: ${realtimeStatus}`}
            >
              {realtimeStatus === 'connected' ? (
                <Wifi className="w-3 h-3 text-emerald-600" />
              ) : (
                <WifiOff className="w-3 h-3 text-slate-400" />
              )}
              <span className="capitalize hidden sm:inline">{realtimeStatus}</span>
            </div>
          )}

          <Link
            href="/docs"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="API Documentation (OpenAPI)"
          >
            <BookOpen className="w-5 h-5" />
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 hover:bg-slate-50 text-sm ${
                          !n.readAt ? 'bg-indigo-50/40 font-medium' : ''
                        }`}
                      >
                        <p className="text-slate-900 text-xs font-semibold">{n.title}</p>
                        <p className="text-slate-600 text-xs mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Org Settings Link */}
          {currentOrgId && (
            <Link
              href={`/organizations/${currentOrgId}/settings`}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Organization Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                aria-label="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search accessible projects and tasks..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full text-slate-900 placeholder-slate-400 focus:outline-none text-base"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 rounded"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
              {searching ? (
                <div className="p-4 text-center text-sm text-slate-400">Searching...</div>
              ) : searchQuery && searchResults.projects.length === 0 && searchResults.tasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No accessible results found</div>
              ) : (
                <>
                  {searchResults.projects.length > 0 && (
                    <div className="p-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 px-2">
                        Projects
                      </span>
                      {searchResults.projects.map((proj) => (
                        <Link
                          key={proj.id}
                          href={`/projects/${proj.id}`}
                          onClick={() => setShowSearchModal(false)}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-sm text-slate-800"
                        >
                          <span className="font-medium">{proj.name}</span>
                          <span className="text-xs text-slate-400 capitalize">{proj.visibility}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.tasks.length > 0 && (
                    <div className="p-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 px-2">
                        Tasks
                      </span>
                      {searchResults.tasks.map((t) => (
                        <Link
                          key={t.id}
                          href={`/projects/${t.projectId}?task=${t.id}`}
                          onClick={() => setShowSearchModal(false)}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-sm text-slate-800"
                        >
                          <div>
                            <span className="font-medium">{t.title}</span>
                            {t.assigneeName && (
                              <span className="text-xs text-slate-400 ml-2">({t.assigneeName})</span>
                            )}
                          </div>
                          <span className="text-xs text-indigo-600 font-medium capitalize">{t.priority}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

