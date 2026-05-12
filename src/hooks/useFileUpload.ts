/**
 * useFileUpload Hook
 * Handles file validation, upload, and error management
 * Automatically shows toast notifications for feedback
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { uploadFileToR2 } from '../sheets/r2';

/**
 * Validation rules for file uploads
 */
export interface FileValidationRules {
  maxSize?: number; // in bytes
  allowedMimes?: string[];
  allowedExtensions?: string[];
}

/**
 * Validated and sanitized file ready for upload
 */
export interface ValidatedFile {
  file: File;
  name: string;
  size: number;
  mime: string;
}

const DEFAULT_VALIDATION_RULES: FileValidationRules = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedMimes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

export interface UseFileUploadReturn {
  uploading: boolean;
  progress: number;
  error: string | null;
  
  validateFile: (file: File, rules?: FileValidationRules) => ValidatedFile | null;
  upload: (file: File, folder: string, rules?: FileValidationRules) => Promise<string | null>;
  clearError: () => void;
}

/**
 * Hook for file upload with validation
 * 
 * @example
 * const { upload, uploading, error } = useFileUpload();
 * 
 * const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (!file) return;
 *   
 *   const url = await upload(file, 'clients/documents');
 *   if (url) {
 *     console.log('File uploaded to:', url);
 *   }
 * };
 */
export function useFileUpload(): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File, rules = DEFAULT_VALIDATION_RULES): ValidatedFile | null => {
      setError(null);

      // Check file size
      if (rules.maxSize && file.size > rules.maxSize) {
        const maxSizeMB = (rules.maxSize / (1024 * 1024)).toFixed(1);
        const message = `File is too large. Maximum size is ${maxSizeMB}MB.`;
        setError(message);
        return null;
      }

      // Check MIME type
      if (rules.allowedMimes && !rules.allowedMimes.includes(file.type)) {
        const message = `File type not allowed. Allowed types: ${rules.allowedMimes.join(', ')}`;
        setError(message);
        return null;
      }

      // Check file extension
      if (rules.allowedExtensions) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && !rules.allowedExtensions.includes(ext)) {
          const message = `File extension not allowed. Allowed: ${rules.allowedExtensions.join(', ')}`;
          setError(message);
          return null;
        }
      }

      // Sanitize filename
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .substring(0, 200);

      return {
        file,
        name: sanitizedName,
        size: file.size,
        mime: file.type,
      };
    },
    []
  );

  const upload = useCallback(
    async (file: File, folder: string, rules?: FileValidationRules): Promise<string | null> => {
      const validated = validateFile(file, rules);
      if (!validated) {
        toast.error(error || 'File validation failed');
        return null;
      }

      setUploading(true);
      setProgress(0);

      try {
        const toastId = toast.loading(`Uploading ${validated.name}...`);

        // Simulate progress updates
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress += Math.random() * 30;
          if (currentProgress > 90) currentProgress = 90;
          setProgress(currentProgress);
        }, 500);

        // Upload to R2
        const url = await uploadFileToR2(validated.file, folder);

        clearInterval(progressInterval);
        setProgress(100);

        toast.success(`${validated.name} uploaded!`, { id: toastId });
        return url;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [validateFile, error]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    validateFile,
    upload,
    clearError,
  };
}

/**
 * Preset validation rules for different file types
 */
export const FILE_VALIDATION_PRESETS = {
  IMAGES: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  } as FileValidationRules,

  DOCUMENTS: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['pdf', 'doc', 'docx'],
  } as FileValidationRules,

  SPREADSHEETS: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedMimes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: ['xls', 'xlsx', 'csv'],
  } as FileValidationRules,
} as const;
