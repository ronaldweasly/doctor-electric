import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { MobileProvider } from '../contexts/MobileContext';

export default function Layout() {
  return (
    <MobileProvider>
      <div className="flex h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <Sidebar />

        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden w-full min-w-0">
          <Navbar />

          {/* Main scrollable content area — only this scrolls, navbar/sidebar fixed */}
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8
                           pb-20 lg:pb-8"> {/* pb-20 = space for bottom nav on mobile */}
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom navigation bar — hidden on desktop */}
        <BottomNav />
      </div>
    </MobileProvider>
  );
}
