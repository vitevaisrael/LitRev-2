import { MultipartFile } from '@fastify/multipart';
import { resolve, relative, isAbsolute } from 'path';
import { env } from '../config/env';
import { getUploadLimits, validateFileSize, validateFileType } from '../utils/tierLimits';

export interface UploadValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedFilename?: string;
}

export interface UploadValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  requireVirusScan?: boolean;
  tier?: string;
}

/**
 * Validate file upload
 */
export async function validateUpload(
  file: MultipartFile,
  options: UploadValidationOptions = {}
): Promise<UploadValidationResult> {
  const {
    maxSize,
    allowedMimeTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions,
    requireVirusScan = env.CLAMAV_ENABLED,
    tier
  } = options;

  // Use tier limits if no explicit limits provided
  const tierLimits = getUploadLimits(tier);
  const effectiveMaxSize = maxSize || tierLimits.size;
  const effectiveAllowedExtensions = allowedExtensions || tierLimits.types;

  const errors: string[] = [];

  // Check file size
  if (file.file.bytesRead > effectiveMaxSize) {
    errors.push(`File size exceeds maximum allowed size of ${effectiveMaxSize} bytes`);
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  // Check file extension
  const extension = getFileExtension(file.filename);
  if (!effectiveAllowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.filename);

  // Virus scan (if enabled)
  if (requireVirusScan) {
    try {
      const virusScanResult = await scanForVirus(file);
      if (!virusScanResult.clean) {
        errors.push(`Virus detected: ${virusScanResult.threat}`);
      }
    } catch (error) {
      console.error('Virus scan failed:', error);
      errors.push('Virus scan failed');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedFilename
  };
}

/**
 * Validate upload request
 */
export async function validateUploadRequest(
  files: MultipartFile[],
  options: UploadValidationOptions = {}
): Promise<UploadValidationResult> {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push('No files provided');
    return { valid: false, errors };
  }

  if (files.length > 10) {
    errors.push('Too many files (maximum 10 allowed)');
  }

  // Validate each file
  for (const file of files) {
    const result = await validateUpload(file, options);
    if (!result.valid) {
      errors.push(...result.errors.map(error => `${file.filename}: ${error}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Sanitize file path properly
 */
export function sanitizeFilePath(userPath: string, baseDir: string): string {
  const resolved = resolve(baseDir, userPath);
  const rel = relative(baseDir, resolved);
  
  if (isAbsolute(rel) || rel.startsWith('..')) {
    throw new Error('Path traversal attempt detected');
  }
  return resolved;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, 255 - extension.length);
    sanitized = nameWithoutExt + extension;
  }
  
  return sanitized;
}

/**
 * Scan file for viruses (stub implementation)
 */
async function scanForVirus(file: MultipartFile): Promise<{ clean: boolean; threat?: string }> {
  // This is a stub implementation
  // In a real implementation, you would:
  // 1. Connect to ClamAV daemon
  // 2. Send file data for scanning
  // 3. Return scan results
  
  // For development, we'll simulate a scan
  if (env.NODE_ENV === 'development') {
    // Check for EICAR test string
    const buffer = await file.toBuffer();
    const content = buffer.toString();
    if (content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return { clean: false, threat: 'EICAR test file' };
    }
  }
  
  return { clean: true };
}
