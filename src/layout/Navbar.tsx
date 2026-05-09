import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useMobile } from '../contexts/MobileContext';
import { NotificationPanel } from './NotificationPanel';
import { cn } from '../utils/cn';

export function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { isSidebarOpen, toggleSidebar } = useMobile();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center
                       justify-between px-3 sm:px-4 md:px-6 lg:px-8 shrink-0 gap-2 sm:gap-4
                       safe-top">
      {/* Left: mobile menu button (only on tablet, hidden on desktop) + logo */}
      <div className="flex items-center gap-2 lg:hidden min-w-0">
        {/* Hamburger — only shown on tablet (md-lg range) where sidebar is a drawer */}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors hidden md:flex lg:hidden
                     items-center justify-center"
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? (
            <X className="w-5 h-5 text-slate-600" />
          ) : (
            <Menu className="w-5 h-5 text-slate-600" />
          )}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <img src="/image.png" alt="Doctor Electric" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-full" />
          <span className="text-sm sm:text-base font-bold text-slate-800 truncate leading-tight">
            Doctor Electric CRM
          </span>
        </div>
      </div>

      {/* Desktop left: page title */}
      <div className="hidden lg:block">
        <h1 className="text-lg font-bold text-slate-800">System Overview</h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 sm:gap-3 lg:gap-4 ml-auto">

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100
                       rounded-xl transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
          <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </div>

        {/* User avatar + dropdown (replaces text logout button) */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                            text-blue-700 text-sm font-bold shrink-0 select-none">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {/* Show name on desktop only */}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">{user?.role}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl
                            ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in
                            slide-in-from-top-2 duration-200">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold bg-blue-100 text-blue-700
                                 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {user?.role}
                </span>
              </div>
              {/* Logout */}
              <button
                onClick={() => { setShowUserMenu(false); logout(); }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-red-600
                           hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
