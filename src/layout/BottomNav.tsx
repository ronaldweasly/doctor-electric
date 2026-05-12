import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

/**
 * BottomNav — visible only on mobile (lg:hidden).
 * Provides thumb-friendly navigation at the bottom of the screen.
 */
export function BottomNav() {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Sales Team', 'Engineer', 'Accountant'] },
    { name: 'Clients',   href: '/clients',   icon: Users,           roles: ['Admin', 'Sales Team', 'Engineer', 'Accountant'] },
    { name: 'Reports',   href: '/reports',   icon: FileBarChart,    roles: ['Admin', 'Accountant'] },
    { name: 'Settings',  href: '/users',     icon: Settings,        roles: ['Admin'] },
  ];

  const filteredNav = navigation.filter(item =>
    !item.roles || item.roles.includes(user?.role || '')
  );

  return (
    <nav className="app-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200
                    safe-bottom shadow-[0_-1px_8px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch justify-around h-16">
        {filteredNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors',
                isActive
                  ? 'text-blue-700'
                  : 'text-slate-400 active:text-slate-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-1.5 rounded-xl transition-all',
                  isActive ? 'bg-blue-50' : ''
                )}>
                  <item.icon className={cn('w-5 h-5', isActive ? 'text-blue-700' : 'text-slate-400')} />
                </div>
                <span className={cn('text-[10px] font-semibold', isActive ? 'text-blue-700' : 'text-slate-400')}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
