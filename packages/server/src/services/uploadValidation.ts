import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';

export interface UploadValidationOptions {
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  requireVirusScan?: boolean;
}

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  fileSize?: number;
  mimeType?: string;
}

// Default validation options
const DEFAULT_OPTIONS: Required<UploadValidationOptions> = {
  maxFileSize: 25 * 1024 * 1024, // 25 MB
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
  requireVirusScan: true
};

/**
 * Validate uploaded file for security and size constraints
 */
export async function validateUpload(
  file: MultipartFile,
  options: UploadValidationOptions = {}
): Promise<UploadValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Check file size
    if (file.file.bytesRead > opts.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${opts.maxFileSize / (1024 * 1024)} MB`
      };
    }

    // Check MIME type
    if (opts.allowedMimeTypes.length > 0 && !opts.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed. Allowed types: ${opts.allowedMimeTypes.join(', ')}`
      };
    }

    // Check file extension
    if (opts.allowedExtensions.length > 0) {
      const extension = getFileExtension(file.filename);
      if (!opts.allowedExtensions.includes(extension.toLowerCase())) {
        return {
          valid: false,
          error: `File extension ${extension} is not allowed. Allowed extensions: ${opts.allowedExtensions.join(', ')}`
        };
      }
    }

    // Generate sanitized filename
    const sanitizedFilename = generateSanitizedFilename(file.filename);

    // Perform virus scan if required
    if (opts.requireVirusScan) {
      const virusScanResult = await performVirusScan(file);
      if (!virusScanResult.clean) {
        return {
          valid: false,
          error: `File failed virus scan: ${virusScanResult.reason}`
        };
      }
    }

    return {
      valid: true,
      sanitizedFilename,
      fileSize: file.file.bytesRead,
      mimeType: file.mimetype
    };

  } catch (error) {
    return {
      valid: false,
      error: `Upload validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate a sanitized filename to prevent path traversal and other security issues
 */
function generateSanitizedFilename(originalFilename: string): string {
  // Remove path traversal attempts
  const sanitized = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, ''); // Remove trailing dots

  // Add timestamp and random suffix to prevent conflicts
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalFilename);
  
  return `${timestamp}_${randomSuffix}${extension}`;
}

/**
 * Extract file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot);
}

/**
 * Perform virus scan on uploaded file
 * This is a stub implementation - in production, integrate with ClamAV or similar
 */
async function performVirusScan(file: MultipartFile): Promise<{ clean: boolean; reason?: string }> {
  try {
    // Attempt to read buffer if available (all envs)
    const toBufferFn =
      typeof (file as any).toBuffer === 'function'
        ? (file as any).toBuffer.bind(file)
        : typeof (file as any).file?.toBuffer === 'function'
          ? (file as any).file.toBuffer.bind((file as any).file)
          : null;

    if (toBufferFn) {
      const buffer = await toBufferFn();
      const content = buffer.toString('utf8');

      // In development, check for EICAR test string
      if (process.env.NODE_ENV === 'development') {
        const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
        if (content.includes(eicarString)) {
          return {
            clean: false,
            reason: 'EICAR test string detected'
          };
        }
      }
    }

    // In production, integrate with ClamAV daemon
    if (process.env.NODE_ENV === 'production' && process.env.CLAMAV_ENABLED === 'true') {
      // TODO: Implement ClamAV integration
      // const clamav = require('clamav');
      // const result = await clamav.scanBuffer(await file.toBuffer());
      // return { clean: result.isClean, reason: result.reason };
      
      // For now, log warning and allow
      console.warn('ClamAV integration not implemented - allowing file upload');
    }

    return { clean: true };
  } catch (error) {
    console.error('Virus scan failed:', error);
    // Propagate error so caller can handle and fail validation gracefully
    throw (error instanceof Error ? error : new Error('Virus scan failed'));
  }
}

/**
 * Validate request for upload security
 */
export function validateUploadRequest(request: FastifyRequest): { valid: boolean; error?: string } {
  // Check for suspicious patterns in request
  const userAgent = request.headers['user-agent'];
  const contentType = request.headers['content-type'];
  
  // Basic bot detection
  if (userAgent && (
    userAgent.includes('bot') ||
    userAgent.includes('crawler') ||
    userAgent.includes('spider') ||
    userAgent.length < 10
  )) {
    return {
      valid: false,
      error: 'Suspicious user agent detected'
    };
  }

  // Check content type
  if (contentType && !contentType.includes('multipart/form-data')) {
    return {
      valid: false,
      error: 'Invalid content type for file upload'
    };
  }

  return { valid: true };
}

/**
 * Get upload limits based on user tier or configuration
 */
export function getUploadLimits(userTier?: string): UploadValidationOptions {
  switch (userTier) {
    case 'premium':
      return {
        maxFileSize: 100 * 1024 * 1024, // 100 MB
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        allowedExtensions: ['.pdf', '.doc', '.docx']
      };
    case 'pro':
      return {
        maxFileSize: 50 * 1024 * 1024, // 50 MB
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      };
    default: // free tier
      return {
        maxFileSize: 25 * 1024 * 1024, // 25 MB
        allowedMimeTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      };
  }
}
