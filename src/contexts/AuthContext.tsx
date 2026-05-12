import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInUser, 
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
  provider: 'email';
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
  const userCacheRef = useRef<Map<string, AuthUser>>(new Map());

  const loadUserRole = async (email: string): Promise<AuthUser | null> => {
    // Check cache first (super fast, <1ms)
    const cached = userCacheRef.current.get(email.toLowerCase());
    if (cached) {
      setUser(cached);
      setError(null);
      return cached;
    }
    
    // If already loading THIS user, wait and don't duplicate the effort
    if (isLoadingRoleRef.current) {
      // Wait up to 3 seconds for the load to complete
      let attempts = 0;
      while (isLoadingRoleRef.current && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      const cached2 = userCacheRef.current.get(email.toLowerCase());
      if (cached2) return cached2;
      if (isLoadingRoleRef.current) return null; // Still loading after timeout
    }
    
    isLoadingRoleRef.current = true;

    try {
      const session = await getCurrentSession();
      if (!session?.user) {
        throw new Error('No active session found');
      }

      const users = await getSheetData<UserRow>(SHEET_NAMES.USERS).catch(err => {
        console.warn('[Auth] Could not fetch users table from DB:', err.message);
        return [];
      });
      
      let matchedUser = users.find((u) => u.Email?.toLowerCase() === email.toLowerCase());

      if (!matchedUser) {
        throw new Error(`User "${email}" is not registered in the system. Please contact your administrator.`);
      }
      
      if (matchedUser.Active !== 'TRUE') {
        throw new Error('Your account is currently inactive. Please contact your administrator.');
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email,
        name: matchedUser.Name || session.user.user_metadata?.name || email.split('@')[0],
        role: matchedUser.Role,
        picture: session.user.user_metadata?.picture || session.user.user_metadata?.avatar_url,
        provider: 'email',
      };

      // Cache the user
      userCacheRef.current.set(email.toLowerCase(), authUser);
      setUser(authUser);
      setError(null);
      
      // Persist to localStorage for session persistence across page refreshes
      localStorage.setItem('solar_crm_auth', JSON.stringify({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        picture: authUser.picture,
        provider: authUser.provider,
      }));
      
      return authUser;
    } catch (err: any) {
      console.error('[Auth] User role loading failed:', err.message);
      setError(err.message || 'Failed to load user profile');
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
        // FIRST: Check localStorage for persisted session (survives page refresh)
        const savedAuth = localStorage.getItem('solar_crm_auth');
        if (savedAuth && mounted) {
          try {
            const cached = JSON.parse(savedAuth);
            
            // Verify user is still active in the database
            if (import.meta.env.VITE_USE_MOCK === 'true') {
              const users = await getSheetData<UserRow>(SHEET_NAMES.USERS).catch(() => []);
              const matchedUser = users.find((u) => u.Email?.toLowerCase() === cached.email.toLowerCase());
              
              if (matchedUser && matchedUser.Active === 'TRUE') {
                // User still exists and is active, restore from cache
                const authUser: AuthUser = {
                  id: cached.id,
                  email: cached.email,
                  name: cached.name,
                  role: cached.role,
                  picture: cached.picture,
                  provider: cached.provider,
                };
                userCacheRef.current.set(cached.email.toLowerCase(), authUser);
                setUser(authUser);
                setError(null);
                if (mounted) setIsLoading(false);
                return;
              } else {
                localStorage.removeItem('solar_crm_auth');
              }
            }
          } catch (parseErr) {
            localStorage.removeItem('solar_crm_auth');
          }
        }
        
        // SECOND: Check for Supabase session
        const session = await getCurrentSession();
        if (!mounted) return;

        if (session?.user?.email) {
          await loadUserRole(session.user.email);
        }
      } catch (err: any) {
        console.error('[Auth] Init error:', err.message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Listen for auth state changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

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
      }
    );

    // Run direct session check
    init();

    // SAFETY NET: If nothing resolves within 3 seconds, stop loading
    // This handles the case where Supabase is unreachable or taking too long
    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) {
        setIsLoading(false);
      }
    }, 3000);

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
      
      if (!session?.user) {
        throw new Error('Login failed. No session returned.');
      }


      
      // Wait for user role to be loaded before continuing
      const userLoaded = await loadUserRole(session.user.email);
      if (!userLoaded) {
        throw new Error('Failed to load user profile');
      }

      // Save session to localStorage for persistence across page refreshes
      localStorage.setItem('solar_crm_auth', JSON.stringify({
        id: userLoaded.id,
        email: userLoaded.email,
        name: userLoaded.name,
        role: userLoaded.role,
        picture: userLoaded.picture,
        provider: userLoaded.provider,
      }));


      // User state is already set by loadUserRole
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed';
      console.error('Email login failed:', err);
      
      // FALLBACK: Try mock authentication for development
      if (errorMessage.includes('Invalid login credentials') && import.meta.env.VITE_USE_MOCK === 'true') {

        try {
          const users = await getSheetData<UserRow>(SHEET_NAMES.USERS).catch(() => []);
          const matchedUser = users.find((u) => u.Email?.toLowerCase() === email.toLowerCase());
          
          if (matchedUser && matchedUser.Active === 'TRUE') {

            const authUser: AuthUser = {
              id: `mock_${email}`,
              email,
              name: matchedUser.Name || email.split('@')[0],
              role: matchedUser.Role,
              picture: undefined,
              provider: 'email',
            };
            
            // Cache and set user
            userCacheRef.current.set(email.toLowerCase(), authUser);
            setUser(authUser);
            setError(null);
            
            // Save session to localStorage for persistence across page refreshes
            localStorage.setItem('solar_crm_auth', JSON.stringify({
              id: authUser.id,
              email: authUser.email,
              name: authUser.name,
              role: authUser.role,
              picture: authUser.picture,
              provider: authUser.provider,
            }));
            

            setIsLoading(false);
            return;
          } else if (!matchedUser) {
            throw new Error(`User "${email}" not found in system`);
          } else {
            throw new Error('Your account is inactive');
          }
        } catch (fallbackErr: any) {
          console.error('[Auth] Mock login also failed:', fallbackErr.message);
          setError(fallbackErr.message || 'Login failed');
        }
      } else {
        setError(errorMessage);
      }
      
      setIsLoading(false);
      // On error, ensure we sign out the phantom session
      try {
        await signOutUser();
      } catch (e) {

      }
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
      console.error('[Auth] Logout failed:', err.message);
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, error }}>
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
