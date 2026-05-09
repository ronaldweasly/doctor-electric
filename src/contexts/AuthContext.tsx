import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInUser, 
  signInWithOAuth, 
  signOutUser, 
  getCurrentSession,
  supabase 
} from '../sheets/supabase';
import { getSheetData } from '../sheets/api';
import { UserRow, Role } from '../sheets/types';
import { SHEET_NAMES } from '../sheets/config';
import { logActivity } from '../sheets/activity';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  picture?: string;
  provider: 'email' | 'google' | 'github' | 'azure';
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github' | 'azure') => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRoleRef = useRef(false);
  const initializedRef = useRef(false);

  const loadUserRole = async (email: string): Promise<AuthUser | null> => {
    if (isLoadingRoleRef.current) return null;
    isLoadingRoleRef.current = true;

    try {
      const session = await getCurrentSession();
      if (!session?.user) throw new Error('No active session');

      const users = await getSheetData<UserRow>(SHEET_NAMES.USERS).catch(err => {
        console.warn('Could not fetch users table from DB, using fallback:', err);
        return [];
      });
      
      let matchedUser = users.find((u) => u.Email?.toLowerCase() === email.toLowerCase());

      // SAFETY FALLBACK: If the DB is empty but you are the admin, let you in!
      if (!matchedUser && email.toLowerCase() === 'admin@solar.com') {
        console.warn('Admin user not found in DB, applying automatic fallback access');
        matchedUser = {
          Email: 'admin@solar.com',
          Role: 'Admin',
          Name: 'System Admin',
          Active: 'TRUE'
        };
        
        // AUTO-FIX: Insert this user into the Supabase database so foreign keys don't break!
        try {
          await supabase.from('users').upsert({
            email: 'admin@solar.com',
            role: 'Admin',
            name: 'System Admin',
            active: true
          });
          console.log('Successfully auto-created admin user in database.');
        } catch (insertErr) {
          console.error('Failed to auto-create admin user:', insertErr);
        }
      }

      if (!matchedUser) {
        throw new Error(`User "${email}" is not registered in the system. Contact your administrator.`);
      }
      if (matchedUser.Active !== 'TRUE') {
        throw new Error('Your account is inactive. Contact your administrator.');
      }

      const provider = (session.user.app_metadata?.provider || 
                        session.user.user_metadata?.provider || 'email') as AuthUser['provider'];

      const authUser: AuthUser = {
        id: session.user.id,
        email,
        name: matchedUser.Name || session.user.user_metadata?.name || email.split('@')[0],
        role: matchedUser.Role,
        picture: session.user.user_metadata?.picture || session.user.user_metadata?.avatar_url,
        provider,
      };

      setUser(authUser);
      setError(null);
      return authUser;
    } catch (err: any) {
      console.error('User role loading failed:', err);
      setError(err.message || 'Failed to load user role');
      await signOutUser().catch(() => {});
      setUser(null);
      return null;
    } finally {
      isLoadingRoleRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        // Directly check for existing session first
        const session = await getCurrentSession();
        if (!mounted) return;

        if (session?.user?.email) {
          await loadUserRole(session.user.email);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Listen for auth state changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.debug('[Auth] event:', event, '| has session:', !!session);

        if (event === 'SIGNED_IN' && session?.user?.email) {
          setIsLoading(true);
          await loadUserRole(session.user.email);
          if (mounted) setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setError(null);
          if (mounted) setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && !user) {
          await loadUserRole(session.user.email!);
        }
        // Note: INITIAL_SESSION is handled by the direct session check above
      }
    );

    // Run direct session check
    init();

    // SAFETY NET: If nothing resolves within 6 seconds, stop loading
    // This handles the case where Supabase is unreachable
    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[Auth] Safety timeout triggered — Supabase may be unreachable. Showing login page.');
        setIsLoading(false);
      }
    }, 6000);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!email || !password) throw new Error('Please enter both email and password');
      const { session } = await signInUser(email, password);
      if (!session?.user) throw new Error('Login failed. No session returned.');
      // onAuthStateChange SIGNED_IN will handle the rest
    } catch (err: any) {
      console.error('Email login failed:', err);
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'github' | 'azure') => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithOAuth(provider);
      // OAuth redirect will handle the rest
    } catch (err: any) {
      console.error('OAuth login failed:', err);
      setError(err.message || `${provider} login failed`);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (user) {
        logActivity({
          userId: user.id,
          userEmail: user.email,
          action: 'VIEW',
          sheet: 'Auth',
          recordId: user.id,
          recordName: user.name,
          details: 'User logged out',
          status: 'success',
        });
      }
      await signOutUser();
      setUser(null);
      setError(null);
      localStorage.removeItem('solar_crm_auth');
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithOAuth, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
