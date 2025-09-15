import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSignedUrl,
  verifySignedUrl,
  generateSecureToken,
  createAccessToken,
  verifyAccessToken,
  sanitizeFilePath,
  generateFileStorageKey
} from './signedUrls';
import { FastifyRequest } from 'fastify';

describe('Signed URLs Service', () => {
  const secret = 'test-secret-key';
  const baseUrl = 'https://api.example.com';

  describe('generateSignedUrl', () => {
    it('should generate a valid signed URL', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret);

      expect(result.url).toContain(baseUrl);
      expect(result.url).toContain(path);
      expect(result.url).toContain('expires=');
      expect(result.url).toContain('signature=');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.signature).toBeDefined();
    });

    it('should generate URL with custom expiration', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { expiresIn: 300 }); // 5 minutes

      const expiresAt = new Date(Date.now() + 300 * 1000);
      expect(result.expiresAt.getTime()).toBeCloseTo(expiresAt.getTime(), -2);
    });

    it('should generate URL with custom method', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { method: 'POST' });

      expect(result.url).toContain('method=POST');
    });

    it('should generate URL with content type', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { contentType: 'application/pdf' });

      expect(result.url).toContain('contentType=application%2Fpdf');
    });

    it('should generate URL with max file size', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { maxFileSize: 1024 * 1024 });

      expect(result.url).toContain('maxFileSize=1048576');
    });
  });

  describe('verifySignedUrl', () => {
    it('should verify a valid signed URL', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { expiresIn: 600 });

      // Extract query parameters from URL
      const url = new URL(result.url);
      const queryParams = Object.fromEntries(url.searchParams);

      const request = {
        method: 'GET',
        url: `${path}?${url.search}`,
        query: queryParams
      } as FastifyRequest;

      const verification = verifySignedUrl(request, secret);

      expect(verification.valid).toBe(true);
      expect(verification.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject expired URL', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { expiresIn: -1 }); // Already expired

      const url = new URL(result.url);
      const queryParams = Object.fromEntries(url.searchParams);

      const request = {
        method: 'GET',
        url: `${path}?${url.search}`,
        query: queryParams
      } as FastifyRequest;

      const verification = verifySignedUrl(request, secret);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('URL has expired');
    });

    it('should reject URL with invalid signature', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret);

      const url = new URL(result.url);
      const queryParams = Object.fromEntries(url.searchParams);
      queryParams.signature = 'invalid-signature';

      const request = {
        method: 'GET',
        url: `${path}?${new URLSearchParams(queryParams).toString()}`,
        query: queryParams
      } as FastifyRequest;

      const verification = verifySignedUrl(request, secret);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Invalid signature');
    });

    it('should reject URL with method mismatch', () => {
      const path = '/files/document.pdf';
      const result = generateSignedUrl(baseUrl, path, secret, { method: 'GET' });

      const url = new URL(result.url);
      const queryParams = Object.fromEntries(url.searchParams);

      const request = {
        method: 'POST', // Different method
        url: `${path}?${url.search}`,
        query: queryParams
      } as FastifyRequest;

      const verification = verifySignedUrl(request, secret);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('HTTP method mismatch');
    });

    it('should reject URL with missing parameters', () => {
      const request = {
        method: 'GET',
        url: '/files/document.pdf',
        query: {}
      } as FastifyRequest;

      const verification = verifySignedUrl(request, secret);

      expect(verification.valid).toBe(false);
      expect(verification.error).toContain('Missing required parameters');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      expect(token1).not.toBe(token2);
    });

    it('should generate token with default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });
  });

  describe('createAccessToken', () => {
    it('should create a valid access token', () => {
      const result = createAccessToken('file123', 'user456', secret);

      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create token with custom expiration', () => {
      const result = createAccessToken('file123', 'user456', secret, 300); // 5 minutes

      const expectedExpiry = new Date(Date.now() + 300 * 1000);
      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const { token } = createAccessToken('file123', 'user456', secret);
      const result = verifyAccessToken(token, secret);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.fileId).toBe('file123');
      expect(result.payload?.userId).toBe('user456');
    });

    it('should reject expired token', () => {
      const { token } = createAccessToken('file123', 'user456', secret, -1); // Already expired
      const result = verifyAccessToken(token, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Token has expired');
    });

    it('should reject token with invalid signature', () => {
      const { token } = createAccessToken('file123', 'user456', secret);
      const invalidToken = token.replace(/\.(.*)$/, '.invalid-signature');
      const result = verifyAccessToken(invalidToken, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature');
    });

    it('should reject malformed token', () => {
      const result = verifyAccessToken('invalid-token', secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token format');
    });
  });

  describe('sanitizeFilePath', () => {
    it('should remove directory traversal attempts', () => {
      const result = sanitizeFilePath('../../../etc/passwd');
      expect(result).toBe('etc/passwd');
    });

    it('should collapse multiple slashes', () => {
      const result = sanitizeFilePath('path//to///file');
      expect(result).toBe('path/to/file');
    });

    it('should remove leading slashes', () => {
      const result = sanitizeFilePath('/path/to/file');
      expect(result).toBe('path/to/file');
    });

    it('should remove trailing slashes', () => {
      const result = sanitizeFilePath('path/to/file/');
      expect(result).toBe('path/to/file');
    });

    it('should handle complex path traversal', () => {
      const result = sanitizeFilePath('../../../path/../to/../../file');
      expect(result).toBe('path/to/file');
    });
  });

  describe('generateFileStorageKey', () => {
    it('should generate a valid storage key', () => {
      const key = generateFileStorageKey('user123', 'project456', 'document.pdf');

      expect(key).toMatch(/^uploads\/user123\/project456\/\d+_[a-f0-9]+_document\.pdf$/);
    });

    it('should sanitize filename in storage key', () => {
      const key = generateFileStorageKey('user123', 'project456', 'document with spaces & symbols!.pdf');

      expect(key).toMatch(/^uploads\/user123\/project456\/\d+_[a-f0-9]+_document_with_spaces___symbols_\.pdf$/);
    });

    it('should generate different keys for same inputs', () => {
      const key1 = generateFileStorageKey('user123', 'project456', 'document.pdf');
      const key2 = generateFileStorageKey('user123', 'project456', 'document.pdf');

      expect(key1).not.toBe(key2);
    });
  });
});
