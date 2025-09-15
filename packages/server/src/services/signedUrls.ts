import { createHmac, randomBytes } from 'crypto';
import { FastifyRequest } from 'fastify';

export interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 600 (10 minutes)
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  contentType?: string;
  maxFileSize?: number;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
  signature: string;
}

/**
 * Generate a signed URL for secure file access
 */
export function generateSignedUrl(
  baseUrl: string,
  path: string,
  secret: string,
  options: SignedUrlOptions = {}
): SignedUrlResult {
  const {
    expiresIn = 600, // 10 minutes default
    method = 'GET',
    contentType,
    maxFileSize
  } = options;

  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const expires = Math.floor(expiresAt.getTime() / 1000);

  // Create query parameters
  const params = new URLSearchParams({
    expires: expires.toString(),
    method,
    path
  });

  if (contentType) {
    params.set('contentType', contentType);
  }

  if (maxFileSize) {
    params.set('maxFileSize', maxFileSize.toString());
  }

  // Generate signature
  const signature = generateSignature(secret, path, expires, method, contentType, maxFileSize);
  params.set('signature', signature);

  const url = `${baseUrl}${path}?${params.toString()}`;

  return {
    url,
    expiresAt,
    signature
  };
}

/**
 * Verify a signed URL
 */
export function verifySignedUrl(
  request: FastifyRequest,
  secret: string
): { valid: boolean; error?: string; expiresAt?: Date } {
  try {
    const { expires, method, path, contentType, maxFileSize, signature } = request.query as any;

    if (!expires || !method || !path || !signature) {
      return {
        valid: false,
        error: 'Missing required parameters'
      };
    }

    // Check expiration
    const expiresAt = new Date(parseInt(expires) * 1000);
    if (expiresAt < new Date()) {
      return {
        valid: false,
        error: 'URL has expired'
      };
    }

    // Verify signature
    const expectedSignature = generateSignature(
      secret,
      path,
      parseInt(expires),
      method,
      contentType,
      maxFileSize ? parseInt(maxFileSize) : undefined
    );

    if (signature !== expectedSignature) {
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }

    // Verify method matches
    if (request.method !== method) {
      return {
        valid: false,
        error: 'HTTP method mismatch'
      };
    }

    // Verify path matches
    if (request.url.split('?')[0] !== path) {
      return {
        valid: false,
        error: 'Path mismatch'
      };
    }

    return {
      valid: true,
      expiresAt
    };

  } catch (error) {
    return {
      valid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate HMAC signature for URL parameters
 */
function generateSignature(
  secret: string,
  path: string,
  expires: number,
  method: string,
  contentType?: string,
  maxFileSize?: number
): string {
  const payload = [
    path,
    expires.toString(),
    method,
    contentType || '',
    maxFileSize?.toString() || ''
  ].join('|');

  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Generate a secure random token for file access
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Create a time-limited access token for file downloads
 */
export function createAccessToken(
  fileId: string,
  userId: string,
  secret: string,
  expiresIn: number = 600
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const payload = {
    fileId,
    userId,
    expires: Math.floor(expiresAt.getTime() / 1000)
  };

  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = createHmac('sha256', secret)
    .update(token)
    .digest('hex');

  return {
    token: `${token}.${signature}`,
    expiresAt
  };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(
  token: string,
  secret: string
): { valid: boolean; payload?: any; error?: string } {
  try {
    const [encodedPayload, signature] = token.split('.');
    
    if (!encodedPayload || !signature) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));

    // Check expiration
    if (payload.expires < Math.floor(Date.now() / 1000)) {
      return {
        valid: false,
        error: 'Token has expired'
      };
    }

    return {
      valid: true,
      payload
    };

  } catch (error) {
    return {
      valid: false,
      error: `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
  return path
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/\/+/g, '/') // Collapse multiple slashes
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Generate secure file storage key
 */
export function generateFileStorageKey(
  userId: string,
  projectId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const randomSuffix = randomBytes(8).toString('hex');
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `uploads/${userId}/${projectId}/${timestamp}_${randomSuffix}_${sanitizedFilename}`;
}
