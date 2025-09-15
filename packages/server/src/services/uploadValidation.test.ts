import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateUpload, validateUploadRequest, getUploadLimits } from './uploadValidation';
import { MultipartFile } from '@fastify/multipart';

// Mock MultipartFile
const createMockFile = (overrides: Partial<MultipartFile> = {}): MultipartFile => ({
  fieldname: 'file',
  filename: 'test.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  file: {
    bytesRead: 1024,
    read: vi.fn(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test content')),
    destroy: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    isPaused: vi.fn().mockReturnValue(false),
    pipe: vi.fn(),
    unpipe: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    setMaxListeners: vi.fn(),
    getMaxListeners: vi.fn().mockReturnValue(10),
    listeners: vi.fn().mockReturnValue([]),
    rawListeners: vi.fn().mockReturnValue([]),
    listenerCount: vi.fn().mockReturnValue(0),
    eventNames: vi.fn().mockReturnValue([]),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn()
  },
  ...overrides
});

describe('Upload Validation Service', () => {
  describe('validateUpload', () => {
    it('should validate a valid PDF file', async () => {
      const file = createMockFile({
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        file: {
          ...createMockFile().file,
          bytesRead: 1024 * 1024 // 1 MB
        }
      });

      const result = await validateUpload(file);

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBeDefined();
      expect(result.fileSize).toBe(1024 * 1024);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should reject file that exceeds size limit', async () => {
      const file = createMockFile({
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        file: {
          ...createMockFile().file,
          bytesRead: 30 * 1024 * 1024 // 30 MB
        }
      });

      const result = await validateUpload(file, { maxFileSize: 25 * 1024 * 1024 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum allowed size');
    });

    it('should reject file with invalid MIME type', async () => {
      const file = createMockFile({
        filename: 'document.exe',
        mimetype: 'application/x-executable',
        file: {
          ...createMockFile().file,
          bytesRead: 1024
        }
      });

      const result = await validateUpload(file, {
        allowedMimeTypes: ['application/pdf']
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type application/x-executable is not allowed');
    });

    it('should reject file with invalid extension', async () => {
      const file = createMockFile({
        filename: 'document.exe',
        mimetype: 'application/pdf',
        file: {
          ...createMockFile().file,
          bytesRead: 1024
        }
      });

      const result = await validateUpload(file, {
        allowedExtensions: ['.pdf']
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File extension .exe is not allowed');
    });

    it('should skip virus scan when disabled', async () => {
      const file = createMockFile({
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        file: {
          ...createMockFile().file,
          bytesRead: 1024
        }
      });

      const result = await validateUpload(file, { requireVirusScan: false });

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBeDefined();
    });

    it('should generate sanitized filename', async () => {
      const file = createMockFile({
        filename: '../../../etc/passwd.pdf',
        mimetype: 'application/pdf',
        file: {
          ...createMockFile().file,
          bytesRead: 1024
        }
      });

      const result = await validateUpload(file);

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBeDefined();
      expect(result.sanitizedFilename).not.toContain('../');
      expect(result.sanitizedFilename).toMatch(/^\d+_[a-z0-9]+\.pdf$/);
    });

    it('should handle validation errors gracefully', async () => {
      const file = createMockFile({
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        file: {
          ...createMockFile().file,
          bytesRead: 1024
        }
      });

      // Test with invalid options to trigger error
      const result = await validateUpload(file, { 
        maxFileSize: -1, // Invalid size
        allowedMimeTypes: [],
        allowedExtensions: []
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateUploadRequest', () => {
    it('should validate a legitimate request', () => {
      const request = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
        }
      } as any;

      const result = validateUploadRequest(request);

      expect(result.valid).toBe(true);
    });

    it('should reject request with bot user agent', () => {
      const request = {
        headers: {
          'user-agent': 'Googlebot/2.1',
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
        }
      } as any;

      const result = validateUploadRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Suspicious user agent detected');
    });

    it('should reject request with invalid content type', () => {
      const request = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'content-type': 'application/json'
        }
      } as any;

      const result = validateUploadRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid content type for file upload');
    });

    it('should reject request with suspiciously short user agent', () => {
      const request = {
        headers: {
          'user-agent': 'curl',
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary'
        }
      } as any;

      const result = validateUploadRequest(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Suspicious user agent detected');
    });
  });

  describe('getUploadLimits', () => {
    it('should return free tier limits by default', () => {
      const limits = getUploadLimits();

      expect(limits.maxFileSize).toBe(25 * 1024 * 1024); // 25 MB
      expect(limits.allowedMimeTypes).toEqual(['application/pdf']);
      expect(limits.allowedExtensions).toEqual(['.pdf']);
    });

    it('should return premium tier limits', () => {
      const limits = getUploadLimits('premium');

      expect(limits.maxFileSize).toBe(100 * 1024 * 1024); // 100 MB
      expect(limits.allowedMimeTypes).toContain('application/pdf');
      expect(limits.allowedMimeTypes).toContain('application/msword');
      expect(limits.allowedExtensions).toContain('.pdf');
      expect(limits.allowedExtensions).toContain('.doc');
    });

    it('should return pro tier limits', () => {
      const limits = getUploadLimits('pro');

      expect(limits.maxFileSize).toBe(50 * 1024 * 1024); // 50 MB
      expect(limits.allowedMimeTypes).toEqual(['application/pdf']);
      expect(limits.allowedExtensions).toEqual(['.pdf']);
    });
  });
});
