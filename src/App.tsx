import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './layout/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Clients = React.lazy(() => import('./pages/Clients'));
const ClientDetail = React.lazy(() => import('./pages/ClientDetail'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Users = React.lazy(() => import('./pages/Users'));

// Loading component for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
        <img
          src="/image.png"
          alt="Doctor Electric"
          className="relative h-20 w-20 rounded-full shadow-lg object-cover"
        />
      </div>
      <div className="text-center space-y-2">
        <p className="text-slate-700 font-semibold text-base">Loading…</p>
        <p className="text-slate-400 text-sm">Fetching page data</p>
      </div>
      <div className="flex gap-1.5">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// Protected route component for role-based access
function ProtectedRoute({ 
  element, 
  allowedRoles 
}: { 
  element: React.ReactElement; 
  allowedRoles: string[] 
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Your role ({user.role}) doesn't have access to this page.</p>
          <a href="/dashboard" className="text-blue-600 hover:text-blue-800">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return element;
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          <img
            src="/image.png"
            alt="Doctor Electric"
            className="relative h-20 w-20 rounded-full shadow-lg object-cover"
          />
        </div>
        <div className="text-center space-y-2">
          <p className="text-slate-700 font-semibold text-base">Doctor Electric CRM</p>
          <p className="text-slate-400 text-sm">Checking authentication…</p>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }


  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Password reset landing page — redirected to login if no reset session */}
        <Route path="/auth/reset-password" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            user ? (
              <NotificationProvider>
                <Layout />
              </NotificationProvider>
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['Admin', 'Sales Team', 'Engineer', 'Accountant']} element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />} />
          <Route path="clients" element={<ProtectedRoute allowedRoles={['Admin', 'Sales Team', 'Engineer', 'Accountant']} element={<Suspense fallback={<PageLoader />}><Clients /></Suspense>} />} />
          <Route path="clients/:id" element={<ProtectedRoute allowedRoles={['Admin', 'Sales Team', 'Engineer', 'Accountant']} element={<Suspense fallback={<PageLoader />}><ClientDetail /></Suspense>} />} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['Admin', 'Accountant']} element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['Admin']} element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
}
