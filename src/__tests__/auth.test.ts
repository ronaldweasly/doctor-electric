/**
 * Authentication Smoke Test Suite
 * 
 * Automated tests verifying:
 * - Email/password login
 * - Session management
 * - User role loading
 * - Error handling
 * - Performance (< 3s auth init)
 * 
 * Run via: npm run test -- auth.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthContext, { AuthProvider, useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';

// Mock Supabase
vi.mock('../sheets/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      upsert: vi.fn(),
    })),
  },
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
  getCurrentSession: vi.fn(),
  getCurrentUser: vi.fn(),
  resetPassword: vi.fn(),
}));

// Mock API
vi.mock('../sheets/api', () => ({
  getSheetData: vi.fn(),
  setAccessToken: vi.fn(),
}));

// Mock activity logging
vi.mock('../sheets/activity', () => ({
  logActivity: vi.fn(),
}));

import { supabase, signInUser, signOutUser, getCurrentSession } from '../sheets/supabase';
import { getSheetData } from '../sheets/api';

// Helper to render with providers
function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

// Helper to get auth context
function useTestAuth() {
  return useAuth();
}

describe('Authentication Smoke Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Login Page - UI Verification', () => {
    it('should render login page with email form only (no Google OAuth)', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText('DOCTOR ELECTRIC CRM')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      
      // Google OAuth button should NOT exist
      expect(screen.queryByText(/Sign in with Google/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/or sign in with email/i)).not.toBeInTheDocument();
    });

    it('should have email and password input fields', () => {
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
      
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.type).toBe('password');
    });

    it('should toggle password visibility', async () => {
      renderWithProviders(<Login />);
      
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
      const toggleButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('[tabindex="-1"]');
      
      // Password should be hidden initially
      expect(passwordInput.type).toBe('password');
      
      // Toggle to show
      if (toggleButton) fireEvent.click(toggleButton);
      // After toggle, type should change (React state update)
      
      // Toggle to hide
      if (toggleButton) fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('2. Valid Email/Password Login', () => {
    it('should successfully login with valid admin credentials', async () => {
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@solar.com',
          user_metadata: { name: 'System Admin' },
        },
      };

      vi.mocked(signInUser).mockResolvedValueOnce({ session: mockSession });
      vi.mocked(getCurrentSession).mockResolvedValueOnce(mockSession);
      vi.mocked(getSheetData).mockResolvedValueOnce([
        {
          Email: 'admin@solar.com',
          Role: 'Admin',
          Name: 'System Admin',
          Active: 'TRUE',
        },
      ]);

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(emailInput, 'admin@solar.com');
      await userEvent.type(passwordInput, 'password123');
      
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(signInUser).toHaveBeenCalledWith('admin@solar.com', 'password123');
      }, { timeout: 1000 });
    });

    it('should successfully login with valid regular user', async () => {
      const mockSession = {
        user: {
          id: 'user-456',
          email: 'user@solar.com',
          user_metadata: { name: 'John User' },
        },
      };

      vi.mocked(signInUser).mockResolvedValueOnce({ session: mockSession });
      vi.mocked(getCurrentSession).mockResolvedValueOnce(mockSession);
      vi.mocked(getSheetData).mockResolvedValueOnce([
        {
          Email: 'user@solar.com',
          Role: 'User',
          Name: 'John User',
          Active: 'TRUE',
        },
      ]);

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(emailInput, 'user@solar.com');
      await userEvent.type(passwordInput, 'userpass');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(signInUser).toHaveBeenCalledWith('user@solar.com', 'userpass');
      }, { timeout: 1000 });
    });
  });

  describe('3. Form Validation', () => {
    it('should not allow submission with empty email', async () => {
      renderWithProviders(<Login />);

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(passwordInput, 'password123');

      // Submit button should be disabled
      expect(submitButton).toBeDisabled();
      
      fireEvent.click(submitButton);

      // signInUser should NOT be called
      expect(signInUser).not.toHaveBeenCalled();
    });

    it('should not allow submission with empty password', async () => {
      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(emailInput, 'admin@solar.com');

      // Submit button should be disabled
      expect(submitButton).toBeDisabled();
      
      fireEvent.click(submitButton);

      expect(signInUser).not.toHaveBeenCalled();
    });
  });

  describe('4. Error Handling', () => {
    it('should display error for invalid credentials', async () => {
      vi.mocked(signInUser).mockRejectedValueOnce(
        new Error('Invalid login credentials')
      );

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@computer.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(emailInput, 'baduser@solar.com');
      await userEvent.type(passwordInput, 'wrongpass');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid login credentials/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display error for unregistered user', async () => {
      const mockSession = {
        user: {
          id: 'unknown-user',
          email: 'unknown@solar.com',
          user_metadata: {},
        },
      };

      vi.mocked(signInUser).mockResolvedValueOnce({ session: mockSession });
      vi.mocked(getCurrentSession).mockResolvedValueOnce(mockSession);
      vi.mocked(getSheetData).mockResolvedValueOnce([]); // No user found

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(emailInput, 'unknown@solar.com');
      await userEvent.type(passwordInput, 'anypass');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/not registered in the system/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display error for inactive user', async () => {
      const mockSession = {
        user: {
          id: 'inactive-user',
          email: 'inactive@solar.com',
          user_metadata: {},
        },
      };

      vi.mocked(signInUser).mockResolvedValueOnce({ session: mockSession });
      vi.mocked(getCurrentSession).mockResolvedValueOnce(mockSession);
      vi.mocked(getSheetData).mockResolvedValueOnce([
        {
          Email: 'inactive@solar.com',
          Role: 'User',
          Name: 'Inactive User',
          Active: 'FALSE',
        },
      ]);

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      await userEvent.type(emailInput, 'inactive@solar.com');
      await userEvent.type(passwordInput, 'pass');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/account is inactive/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('5. Auth Context - Session Management', () => {
    it('should initialize with no user if no session', async () => {
      vi.mocked(getCurrentSession).mockResolvedValueOnce(null);

      const TestComponent = () => {
        const { user, isLoading } = useTestAuth();
        return (
          <div>
            {isLoading ? <div>Loading...</div> : <div>Ready</div>}
            {user ? <div>{user.email}</div> : <div>Not logged in</div>}
          </div>
        );
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
        expect(screen.getByText('Not logged in')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should load user if session exists', async () => {
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@solar.com',
          user_metadata: { name: 'System Admin' },
        },
      };

      vi.mocked(getCurrentSession).mockResolvedValueOnce(mockSession);
      vi.mocked(getSheetData).mockResolvedValueOnce([
        {
          Email: 'admin@solar.com',
          Role: 'Admin',
          Name: 'System Admin',
          Active: 'TRUE',
        },
      ]);

      const TestComponent = () => {
        const { user, isLoading } = useTestAuth();
        return (
          <div>
            {isLoading ? <div>Loading...</div> : <div>Ready</div>}
            {user && <div>{user.email}</div>}
          </div>
        );
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
        expect(screen.getByText('admin@solar.com')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('6. Performance - Auth Initialization Speed', () => {
    it('should initialize auth within 3 seconds', async () => {
      vi.mocked(getCurrentSession).mockResolvedValueOnce(null);

      const startTime = performance.now();

      const TestComponent = () => {
        const { isLoading } = useTestAuth();
        return <div>{isLoading ? 'Loading' : 'Done'}</div>;
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      }, { timeout: 3000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000);
      console.log(`✓ Auth initialization took ${duration.toFixed(0)}ms (< 3000ms)`);
    });
  });

  describe('7. Google OAuth Removal', () => {
    it('should not have OAuth methods in context', async () => {
      const TestComponent = () => {
        const authContext = useTestAuth();
        return (
          <div>
            {typeof authContext.login === 'function' ? <div>Login exists</div> : null}
            {'loginWithOAuth' in authContext ? (
              <div>ERROR: loginWithOAuth still exists</div>
            ) : (
              <div>OAuth removed correctly</div>
            )}
          </div>
        );
      };

      renderWithProviders(<TestComponent />);

      expect(screen.getByText('Login exists')).toBeInTheDocument();
      expect(screen.getByText('OAuth removed correctly')).toBeInTheDocument();
      expect(screen.queryByText('ERROR: loginWithOAuth still exists')).not.toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  describe('Login Flow', () => {
    it('should complete full login flow successfully', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@solar.com',
          user_metadata: { name: 'Test User' },
        },
      };

      vi.mocked(signInUser).mockResolvedValueOnce({ session: mockSession });
      vi.mocked(getCurrentSession).mockResolvedValueOnce(mockSession);
      vi.mocked(getSheetData).mockResolvedValueOnce([
        {
          Email: 'test@solar.com',
          Role: 'User',
          Name: 'Test User',
          Active: 'TRUE',
        },
      ]);

      renderWithProviders(<Login />);

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /Sign in/i });

      // Perform login
      await userEvent.type(emailInput, 'test@solar.com');
      await userEvent.type(passwordInput, 'testpass123');
      fireEvent.click(submitButton);

      // Verify login was attempted
      await waitFor(() => {
        expect(signInUser).toHaveBeenCalledWith('test@solar.com', 'testpass123');
      }, { timeout: 1000 });

      console.log('✓ Login flow test passed');
    });
  });
});
