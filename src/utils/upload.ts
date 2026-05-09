/**
 * File Upload Validation and Management
 * Ensures safe, organized file uploads
 */

export interface UploadValidationConfig {
  maxFileSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  sanitizeFilename: boolean;
  preventDuplicates: boolean;
}

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedFilename?: string;
  sanitizedFile?: File;
}

// Default safe upload config
export const DEFAULT_UPLOAD_CONFIG: UploadValidationConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'csv', 'xls', 'xlsx', 'doc', 'docx'],
  sanitizeFilename: true,
  preventDuplicates: true,
};

/**
 * Validate uploaded file
 */
export function validateUploadFile(
  file: File,
  config: Partial<UploadValidationConfig> = {}
): UploadValidationResult {
  const finalConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config };
  const errors: string[] = [];

  // Check file size
  if (file.size === 0) {
    errors.push('File is empty');
  }
  if (file.size > finalConfig.maxFileSize) {
    const maxMB = (finalConfig.maxFileSize / (1024 * 1024)).toFixed(1);
    errors.push(`File size exceeds ${maxMB}MB limit`);
  }

  // Check file type (MIME type)
  if (!finalConfig.allowedTypes.includes(file.type)) {
    errors.push(
      `File type "${file.type}" not allowed. Allowed types: ${finalConfig.allowedTypes.join(', ')}`
    );
  }

  // Check extension
  const extension = getFileExtension(file.name).toLowerCase();
  if (!finalConfig.allowedExtensions.includes(extension)) {
    errors.push(
      `File extension ".${extension}" not allowed. Allowed: ${finalConfig.allowedExtensions.join(', ')}`
    );
  }

  // Additional security checks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    errors.push('Invalid filename: contains path separators');
  }

  // Sanitize filename
  let sanitizedFilename = file.name;
  if (finalConfig.sanitizeFilename) {
    sanitizedFilename = sanitizeFilename(file.name);
  }

  // Create sanitized file if needed
  let sanitizedFile = file;
  if (sanitizedFilename !== file.name) {
    sanitizedFile = new File([file], sanitizedFilename, { type: file.type });
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFilename,
    sanitizedFile: errors.length === 0 ? sanitizedFile : undefined,
  };
}

/**
 * Sanitize filename to prevent injection attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove unsafe characters
  let sanitized = filename
    .replace(/[<>:"|?*]/g, '') // Remove unsafe chars
    .replace(/\.\./g, '') // Remove directory traversal
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^\w.-]/g, ''); // Keep only alphanumeric, dots, underscores, hyphens

  // Ensure it's not empty
  if (!sanitized) {
    sanitized = `file_${Date.now()}`;
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized);
    const name = sanitized.substring(0, 200 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Generate safe unique filename
 */
export function generateUniqueFilename(
  originalFilename: string,
  clientId?: string,
  documentType?: string
): string {
  const extension = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);

  const prefix = documentType
    ? `${documentType.toLowerCase()}_`
    : '';
  const clientPrefix = clientId
    ? `${clientId}_`
    : '';

  return `${clientPrefix}${prefix}${timestamp}_${randomId}.${extension}`;
}

/**
 * Organize upload path by date and document type
 */
export function getOrganizedUploadPath(
  clientId: string,
  documentType: string,
  filename: string
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Format: /uploads/2024/05/06/solar_client_123_survey/filename.pdf
  const folder = `uploads/${year}/${month}/${day}/${documentType.toLowerCase()}_${clientId}`;
  return `${folder}/${filename}`;
}

/**
 * Check for duplicate file uploads (within same session)
 */
export function isDuplicateUpload(filename: string, clientId: string): boolean {
  const uploadKey = `upload_${clientId}_${filename}`;
  const recent = sessionStorage.getItem(uploadKey);
  return !!recent;
}

/**
 * Mark file as uploaded
 */
export function markFileAsUploaded(filename: string, clientId: string, url: string) {
  const uploadKey = `upload_${clientId}_${filename}`;
  sessionStorage.setItem(uploadKey, JSON.stringify({ url, timestamp: Date.now() }));
}

/**
 * Validate batch uploads
 */
export function validateBatchUpload(
  files: File[],
  config?: Partial<UploadValidationConfig>
): {
  valid: File[];
  invalid: { file: File; errors: string[] }[];
  totalSize: number;
} {
  const validFiles: File[] = [];
  const invalidFiles: { file: File; errors: string[] }[] = [];
  let totalSize = 0;

  for (const file of files) {
    const result = validateUploadFile(file, config);
    if (result.valid && result.sanitizedFile) {
      validFiles.push(result.sanitizedFile);
      totalSize += result.sanitizedFile.size;
    } else {
      invalidFiles.push({ file, errors: result.errors });
    }
  }

  return { valid: validFiles, invalid: invalidFiles, totalSize };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create file upload record for tracking
 */
export interface FileUploadRecord {
  id: string;
  filename: string;
  originalFilename: string;
  clientId: string;
  documentType: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  status: 'pending' | 'completed' | 'failed';
}

const UPLOADS_STORAGE_KEY = 'solar_crm_uploads';

export function addUploadRecord(record: Omit<FileUploadRecord, 'id'>): FileUploadRecord {
  const fullRecord: FileUploadRecord = {
    ...record,
    id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };

  try {
    const records = getUploadRecords();
    records.push(fullRecord);
    localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(records.slice(-500))); // Keep last 500
  } catch (error) {
    console.error('Failed to save upload record:', error);
  }

  return fullRecord;
}

export function getUploadRecords(clientId?: string): FileUploadRecord[] {
  try {
    const records = JSON.parse(localStorage.getItem(UPLOADS_STORAGE_KEY) || '[]');
    if (clientId) {
      return records.filter((r: FileUploadRecord) => r.clientId === clientId);
    }
    return records;
  } catch {
    return [];
  }
}

export function getUploadStats(clientId: string) {
  const records = getUploadRecords(clientId);
  const completed = records.filter(r => r.status === 'completed');
  const totalSize = completed.reduce((sum, r) => sum + r.fileSize, 0);

  return {
    total: records.length,
    completed: completed.length,
    failed: records.filter(r => r.status === 'failed').length,
    pending: records.filter(r => r.status === 'pending').length,
    totalSize,
  };
}
