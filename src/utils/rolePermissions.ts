import { Role } from '../sheets/types';

/**
 * Role-based permission system for Solar CRM
 * Defines what each role can view and do
 */

export type Permission = 
  | 'view_dashboard'
  | 'view_clients'
  | 'create_client'
  | 'edit_client'
  | 'delete_client'
  | 'view_reports'
  | 'view_financial'
  | 'view_installations'
  | 'manage_installations'
  | 'manage_users'
  | 'change_user_password'
  | 'create_users'
  | 'edit_user_role'
  | 'delete_users'
  | 'view_all_activities'
  | 'view_own_activities';

interface RolePermissions {
  [key: string]: Permission[];
}

const ROLE_PERMISSIONS: RolePermissions = {
  Admin: [
    'view_dashboard',
    'view_clients',
    'create_client',
    'edit_client',
    'delete_client',
    'view_reports',
    'view_financial',
    'view_installations',
    'manage_installations',
    'manage_users',
    'change_user_password',
    'create_users',
    'edit_user_role',
    'delete_users',
    'view_all_activities',
    'view_own_activities',
  ],
  Manager: [
    'view_dashboard',
    'view_clients',
    'create_client',
    'edit_client',
    'view_reports',
    'view_financial',
    'view_installations',
    'manage_installations',
    'view_all_activities',
    'view_own_activities',
    // Explicitly NOT allowed:
    // - manage_users
    // - change_user_password
    // - create_users
    // - edit_user_role
  ],
  'Sales Team': [
    'view_dashboard',
    'view_clients',
    'create_client',
    'edit_client',
    'view_own_activities',
  ],
  Engineer: [
    'view_dashboard',
    'view_clients',
    'view_installations',
    'manage_installations',
    'view_own_activities',
  ],
  Accountant: [
    'view_dashboard',
    'view_clients',
    'view_reports',
    'view_financial',
    'view_all_activities',
    'view_own_activities',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if user can access a feature
 */
export function canAccess(role: Role, feature: 'users' | 'reports' | 'financial' | 'installations'): boolean {
  switch (feature) {
    case 'users':
      return hasPermission(role, 'manage_users');
    case 'reports':
      return hasPermission(role, 'view_reports');
    case 'financial':
      return hasPermission(role, 'view_financial');
    case 'installations':
      return hasPermission(role, 'view_installations');
    default:
      return false;
  }
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can manage other users (create, edit, delete, change password)
 */
export function canManageUsers(role: Role): boolean {
  return hasPermission(role, 'manage_users');
}

/**
 * Check if user can change another user's password
 * Only Admin can change other user's passwords
 * Users can always change their own password
 */
export function canChangeUserPassword(role: Role, isOwnPassword: boolean = true): boolean {
  if (isOwnPassword) {
    // Any user can change their own password
    return true;
  }
  // Only Admin can change other user's passwords
  return hasPermission(role, 'change_user_password');
}

/**
 * Check if user can create new users
 */
export function canCreateUsers(role: Role): boolean {
  return hasPermission(role, 'create_users');
}

/**
 * Check if user can edit user roles
 */
export function canEditUserRole(role: Role): boolean {
  return hasPermission(role, 'edit_user_role');
}

/**
 * Get dashboard view type based on role
 */
export type DashboardView = 'admin' | 'manager' | 'sales' | 'engineer' | 'accountant';

export function getDashboardView(role: Role): DashboardView {
  const viewMap: { [key in Role]: DashboardView } = {
    Admin: 'admin',
    Manager: 'manager',
    'Sales Team': 'sales',
    Engineer: 'engineer',
    Accountant: 'accountant',
  };
  return viewMap[role];
}

/**
 * Determine which dashboard metrics should be displayed
 */
export interface DashboardConfig {
  showFinancials: boolean;
  showInstallations: boolean;
  showCampaigns: boolean;
  showUserManagement: boolean;
  showAllActivities: boolean;
  canCreateClients: boolean;
  canCreateUsers: boolean;
}

export function getDashboardConfig(role: Role): DashboardConfig {
  switch (role) {
    case 'Admin':
      return {
        showFinancials: true,
        showInstallations: true,
        showCampaigns: true,
        showUserManagement: true,
        showAllActivities: true,
        canCreateClients: true,
        canCreateUsers: true,
      };
    case 'Manager':
      return {
        showFinancials: true,
        showInstallations: true,
        showCampaigns: true,
        showUserManagement: false, // Can't manage users
        showAllActivities: true,
        canCreateClients: true,
        canCreateUsers: false, // Can't create users
      };
    case 'Sales Team':
      return {
        showFinancials: false, // Only own leads
        showInstallations: false,
        showCampaigns: true, // Their sales pipeline
        showUserManagement: false,
        showAllActivities: false,
        canCreateClients: true,
        canCreateUsers: false,
      };
    case 'Engineer':
      return {
        showFinancials: false,
        showInstallations: true, // Their projects
        showCampaigns: false,
        showUserManagement: false,
        showAllActivities: false,
        canCreateClients: false,
        canCreateUsers: false,
      };
    case 'Accountant':
      return {
        showFinancials: true,
        showInstallations: false,
        showCampaigns: false,
        showUserManagement: false,
        showAllActivities: true,
        canCreateClients: false,
        canCreateUsers: false,
      };
    default:
      return {
        showFinancials: false,
        showInstallations: false,
        showCampaigns: false,
        showUserManagement: false,
        showAllActivities: false,
        canCreateClients: false,
        canCreateUsers: false,
      };
  }
}
