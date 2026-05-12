import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, Settings, Calculator, FileText, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMobile } from '../contexts/MobileContext';
import { cn } from '../utils/cn';

export function Sidebar() {
  const { user } = useAuth();
  const { isSidebarOpen, closeSidebar } = useMobile();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Sales Team', 'Engineer', 'Accountant'] },
    { name: 'Clients', href: '/clients', icon: Users, roles: ['Admin', 'Manager', 'Sales Team', 'Engineer', 'Accountant'] },
    { name: 'Reports', href: '/reports', icon: FileBarChart, roles: ['Admin', 'Manager', 'Accountant'] },
    { name: 'Users', href: '/users', icon: Settings, roles: ['Admin'] },
  ];

  const filteredNav = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  );

  const handleNavClick = () => {
    closeSidebar();
  };

  // Mobile/Tablet drawer
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <img src="/image.png" alt="Doctor Electric" className="h-12 w-12 flex-shrink-0 rounded-full" />
          <span className="font-bold text-xl tracking-tight text-slate-800">DOCTOR ELECTRIC CRM</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-md flex items-center gap-3 font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile/Tablet Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile/Tablet Drawer */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <img src="/image.png" alt="Doctor Electric" className="h-12 w-12 flex-shrink-0 rounded-full" />
          <span className="font-bold text-xl tracking-tight text-slate-800">DOCTOR ELECTRIC CRM</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-md flex items-center gap-3 font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
