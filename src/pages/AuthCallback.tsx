import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../sheets/supabase';
import { Sun } from 'lucide-react';

/**
 * AuthCallback — mounted at /auth/callback
 *
 * Supabase redirects here after the OAuth provider approves the login.
 * The Supabase client automatically parses the URL fragment / code and
 * fires `onAuthStateChange`. We just wait for that event, then redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    const goToDashboard = () => {
      if (!mounted) return;
      setTimeout(() => navigate('/dashboard', { replace: true }), 300);
    };

    const failAuth = (message: string) => {
      if (!mounted) return;
      setStatus('error');
      setErrorMsg(message);
    };

    // Immediately check for an already-established session first.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) {
          goToDashboard();
        }
      })
      .catch(() => {
        // noop: fallback listener + timeout handle failures
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        goToDashboard();
        return;
      }

      // Explicit sign-out from provider flow should surface as an auth failure.
      if (event === 'SIGNED_OUT') {
        failAuth('Authentication failed. Please try again.');
      }
    });

    // Safety net: poll briefly for session before failing hard.
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data.session?.user) {
        goToDashboard();
      } else {
        failAuth('Authentication timed out. Please sign in again.');
      }
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
      {status === 'processing' ? (
        <>
          {/* Animated solar logo spinner */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 shadow-md">
              <Sun className="w-8 h-8 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-700 font-semibold text-base">Signing you in…</p>
            <p className="text-slate-400 text-sm mt-1">Completing authentication, please wait.</p>
          </div>
        </>
      ) : (
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-slate-800 font-semibold">{errorMsg}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm text-blue-700 underline hover:text-blue-900"
          >
            Back to login
          </button>
        </div>
      )}
    </div>
  );
}
