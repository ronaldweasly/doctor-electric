import { useAuth } from '../contexts/AuthContext';
import {
  hasPermission,
  canAccess,
  canManageUsers,
  canChangeUserPassword,
  canCreateUsers,
  canEditUserRole,
  getDashboardView,
  getDashboardConfig,
  Permission,
  DashboardView,
  DashboardConfig,
} from '../utils/rolePermissions';

/**
 * Hook to check role-based permissions for current user
 * Usage:
 *   const { hasPermission, canManageUsers } = useRoleAccess();
 *   if (hasPermission('create_client')) { ... }
 */
export function useRoleAccess() {
  const { user } = useAuth();

  return {
    role: user?.role,
    hasPermission: (permission: Permission) =>
      user ? hasPermission(user.role, permission) : false,
    canAccess: (feature: 'users' | 'reports' | 'financial' | 'installations') =>
      user ? canAccess(user.role, feature) : false,
    canManageUsers: () => (user ? canManageUsers(user.role) : false),
    canChangeUserPassword: (isOwnPassword: boolean = true) =>
      user ? canChangeUserPassword(user.role, isOwnPassword) : false,
    canCreateUsers: () => (user ? canCreateUsers(user.role) : false),
    canEditUserRole: () => (user ? canEditUserRole(user.role) : false),
    getDashboardView: (): DashboardView =>
      user ? getDashboardView(user.role) : 'admin',
    getDashboardConfig: (): DashboardConfig =>
      user ? getDashboardConfig(user.role) : getDashboardConfig('Sales Team'),
  };
}

/**
 * Hook to check if user has access to a specific page/feature
 * Returns boolean indicating if access is allowed
 */
export function useCanAccess(feature: 'users' | 'reports' | 'financial' | 'installations'): boolean {
  const { canAccess: check } = useRoleAccess();
  return check(feature);
}

/**
 * Hook to check if user can manage users
 */
export function useCanManageUsers(): boolean {
  const { canManageUsers: check } = useRoleAccess();
  return check();
}

/**
 * Hook to check if user can change a user's password
 * @param isOwnPassword - true if changing own password, false if changing another user's
 */
export function useCanChangePassword(isOwnPassword: boolean = true): boolean {
  const { canChangeUserPassword: check } = useRoleAccess();
  return check(isOwnPassword);
}

/**
 * Hook to check if user can create new users
 */
export function useCanCreateUsers(): boolean {
  const { canCreateUsers: check } = useRoleAccess();
  return check();
}

/**
 * Hook to get dashboard configuration based on role
 */
export function useDashboardConfig(): DashboardConfig {
  const { getDashboardConfig: getConfig } = useRoleAccess();
  return getConfig();
}
