/**
 * Custom React Hooks
 * Centralized location for reusable hook logic
 */

export { useFormValidation, type UseFormValidationOptions, type UseFormValidationReturn } from './useFormValidation';
export { useFileUpload, type UseFileUploadReturn, FILE_VALIDATION_PRESETS } from './useFileUpload';
export {
  useRoleAccess,
  useCanAccess,
  useCanManageUsers,
  useCanChangePassword,
  useCanCreateUsers,
  useDashboardConfig,
} from './useRoleAccess';
