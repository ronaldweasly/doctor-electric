import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

export default function Login() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
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
