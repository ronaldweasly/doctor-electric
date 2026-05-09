import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

export default function Login() {
  const { login, loginWithOAuth, isLoading, error } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  const handleGoogleLogin = async () => {
    await loginWithOAuth('google');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">

        {/* Logo + title */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse" />
            <img
              src="/image.png"
              alt="Doctor Electric"
              className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full shadow-lg object-cover"
            />
          </div>
          <h1 className="text-center text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            DOCTOR ELECTRIC CRM
          </h1>
          <p className="mt-2 text-center text-xs sm:text-sm text-slate-500 font-medium">
            Sign in to access your dashboard
          </p>
        </div>

        <Card className="shadow-sm border border-slate-200">
          <CardContent className="p-4 sm:p-8">

            {/* Error banner */}
            {error && (
              <div className="mb-5 rounded-md bg-red-50 p-3 sm:p-4 border border-red-100">
                <h3 className="text-xs sm:text-sm font-semibold text-red-800">Login Error</h3>
                <p className="mt-1 text-xs sm:text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">

              {/* Google OAuth button */}
              <button
                id="btn-google-login"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="group relative flex w-full justify-center items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 transition-all"
              >
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {isLoading ? 'Redirecting\u2026' : 'Sign in with Google'}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-medium">or sign in with email</span>
                </div>
              </div>

              {/* Email / password form */}
              <form onSubmit={handleEmailLogin} className="space-y-3 sm:space-y-4">

                {/* Email field */}
                <div className="space-y-1">
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 transition"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  id="btn-email-login"
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Signing in\u2026' : 'Sign In'}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
              Only authorised staff members can access this system.
              <br />
              Contact your administrator if you need access.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
