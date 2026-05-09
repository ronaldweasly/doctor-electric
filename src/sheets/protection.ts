/**
 * Sheet Protection System
 * Prevents direct edits to critical columns/sheets
 * Enforces business logic before allowing modifications
 */

import { Role } from './types';

export interface ProtectionRule {
  sheet: string;
  columns: string[];
  protectedRoles: Role[];
  reason: string;
}

export interface EditPermission {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

// Define which columns are protected and who can edit them
const PROTECTION_RULES: ProtectionRule[] = [
  {
    sheet: 'Clients',
    columns: ['ID', 'Created Date'], // Admin-only fields
    protectedRoles: ['Sales Team', 'Engineer', 'Accountant'],
    reason: 'These fields should not be manually edited',
  },
  {
    sheet: 'Users',
    columns: ['Email', 'Role'], // Should only change via admin panel
    protectedRoles: ['Sales Team', 'Engineer', 'Accountant'],
    reason: 'User settings can only be changed by administrators',
  },
  {
    sheet: 'WORKFLOW_STATUS',
    columns: ['Updated At', 'Updated By'], // System-managed
    protectedRoles: ['Sales Team', 'Engineer', 'Accountant', 'Admin'],
    reason: 'These are automatically managed by the system',
  },
  {
    sheet: 'PAYMENTS',
    columns: ['Paid Amount (₹)', 'Pending Amount (₹)'], // Requires approval
    protectedRoles: ['Sales Team', 'Engineer'],
    reason: 'Payment changes require accountant approval',
  },
];

/**
 * Check if a user can edit a specific cell
 */
export function canEditCell(
  sheet: string,
  column: string,
  userRole?: Role
): EditPermission {
  if (!userRole) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  const rule = PROTECTION_RULES.find(r => r.sheet === sheet);

  if (!rule) {
    return { allowed: true }; // No rules = allowed
  }

  if (!rule.columns.includes(column)) {
    return { allowed: true }; // Column not protected = allowed
  }

  // Check if user's role is in protected list
  if (rule.protectedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: rule.reason,
    };
  }

  return { allowed: true };
}

/**
 * Validate row update before sending to API
 */
export function validateRowUpdate(
  sheet: string,
  updates: Record<string, any>,
  userRole?: Role
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userRole) {
    errors.push('User not authenticated');
    return { valid: false, errors };
  }

  // Check each field being updated
  for (const [column, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;

    const permission = canEditCell(sheet, column, userRole);
    if (!permission.allowed) {
      errors.push(`Cannot edit ${column}: ${permission.reason}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all protected columns for a sheet
 */
export function getProtectedColumns(sheet: string): string[] {
  const rule = PROTECTION_RULES.find(r => r.sheet === sheet);
  return rule?.columns || [];
}

/**
 * Check if a sheet is fully protected (can only be viewed)
 */
export function isSheetReadOnly(sheet: string, userRole?: Role): boolean {
  if (!userRole) return true;

  // System-managed sheets
  const readOnlySheets = ['WORKFLOW_STATUS'];

  if (readOnlySheets.includes(sheet) && userRole !== 'Admin') {
    return true;
  }

  return false;
}

/**
 * Get protection status for display
 */
export function getProtectionStatus(sheet: string, userRole?: Role) {
  const protectedColumns = getProtectedColumns(sheet);
  const isReadOnly = isSheetReadOnly(sheet, userRole);

  return {
    sheet,
    protectedColumns,
    isReadOnly,
    warning: isReadOnly ? 'This sheet is read-only for your role' : undefined,
  };
}

/**
 * Filter row data to only include editable fields
 */
export function filterEditableFields(
  sheet: string,
  data: Record<string, any>,
  userRole?: Role
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_')) {
      // Skip internal fields
      continue;
    }

    const permission = canEditCell(sheet, key, userRole);
    if (permission.allowed) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Log protection violation
 */
export function logProtectionViolation(
  userId: string,
  sheet: string,
  column: string,
  attemptedValue: any,
  userRole?: Role
) {
  const timestamp = new Date().toISOString();
  const message = `PROTECTION VIOLATION at ${timestamp}: User ${userId} (${userRole}) attempted to edit ${sheet}.${column}`;

  try {
    // Store in localStorage for audit
    const violations = JSON.parse(
      localStorage.getItem('solar_crm_protection_violations') || '[]'
    );
    violations.push({
      timestamp,
      userId,
      sheet,
      column,
      attemptedValue,
      userRole,
    });
    localStorage.setItem(
      'solar_crm_protection_violations',
      JSON.stringify(violations.slice(-100)) // Keep last 100
    );
  } catch (error) {
    console.error('Failed to log protection violation:', error);
  }

  console.warn(message);
}

/**
 * Get all protection violations
 */
export function getProtectionViolations() {
  try {
    return JSON.parse(
      localStorage.getItem('solar_crm_protection_violations') || '[]'
    );
  } catch {
    return [];
  }
}

/**
 * Clear protection violation logs
 */
export function clearProtectionViolations() {
  localStorage.removeItem('solar_crm_protection_violations');
}
