import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateSignedUrl, 
  validateSignedUrl,
  generateDocumentSignedUrl,
  generateExportSignedUrl,
  generateUploadSignedUrl
} from './signedUrls';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn()
  })),
  GetObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn()
}));

// Mock environment
vi.mock('../config/env', () => ({
  env: {
    S3_ENDPOINT: 'https://s3.example.com',
    S3_ACCESS_KEY_ID: 'test-access-key',
    S3_SECRET_ACCESS_KEY: 'test-secret-key',
    S3_REGION: 'us-east-1',
    S3_BUCKET: 'test-bucket'
  }
}));

describe('signedUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/test-key?signature=abc123');

      const url = await generateSignedUrl('test-key', 3600);

      expect(url).toBe('https://s3.example.com/test-bucket/test-key?signature=abc123');
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });

    it('should generate a signed URL with custom expiration', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/test-key?signature=abc123');

      const url = await generateSignedUrl('test-key', 7200);

      expect(url).toBe('https://s3.example.com/test-bucket/test-key?signature=abc123');
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 7200 }
      );
    });

    it('should handle missing S3 configuration gracefully', async () => {
      vi.doMock('../config/env', () => ({
        env: {
          S3_ENDPOINT: undefined,
          S3_ACCESS_KEY_ID: undefined,
          S3_SECRET_ACCESS_KEY: undefined,
          S3_REGION: undefined,
          S3_BUCKET: undefined
        }
      }));

      // Re-import to get the mocked environment
      const { generateSignedUrl: generateSignedUrlMocked } = await import('./signedUrls');
      
      const url = await generateSignedUrlMocked('test-key');

      expect(url).toBe('https://example.com/placeholder/test-key');
    });

    it('should handle S3 errors', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockRejectedValue(new Error('S3 error'));

      await expect(generateSignedUrl('test-key')).rejects.toThrow('Failed to generate signed URL');
    });
  });

  describe('validateSignedUrl', () => {
    it('should validate a valid signed URL', () => {
      const validUrl = 'https://s3.example.com/bucket/key?X-Amz-Signature=abc123&X-Amz-Expires=3600';
      
      expect(validateSignedUrl(validUrl)).toBe(true);
    });

    it('should validate a URL with signature parameter', () => {
      const validUrl = 'https://s3.example.com/bucket/key?signature=abc123&expires=3600';
      
      expect(validateSignedUrl(validUrl)).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateSignedUrl('not-a-url')).toBe(false);
      expect(validateSignedUrl('ftp://example.com/file')).toBe(false);
    });

    it('should reject URLs without signature', () => {
      const invalidUrl = 'https://s3.example.com/bucket/key?other=param';
      
      expect(validateSignedUrl(invalidUrl)).toBe(false);
    });
  });

  describe('generateDocumentSignedUrl', () => {
    it('should generate document signed URL', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/documents/doc1/file.pdf?signature=abc123');

      const url = await generateDocumentSignedUrl('doc1', 'file.pdf', 3600);

      expect(url).toBe('https://s3.example.com/test-bucket/documents/doc1/file.pdf?signature=abc123');
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });

    it('should use default expiration', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/documents/doc1/file.pdf?signature=abc123');

      await generateDocumentSignedUrl('doc1', 'file.pdf');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });
  });

  describe('generateExportSignedUrl', () => {
    it('should generate export signed URL', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/exports/proj1/exp1/file.docx?signature=abc123');

      const url = await generateExportSignedUrl('proj1', 'exp1', 'file.docx', 7200);

      expect(url).toBe('https://s3.example.com/test-bucket/exports/proj1/exp1/file.docx?signature=abc123');
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 7200 }
      );
    });

    it('should use default expiration for exports', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/exports/proj1/exp1/file.docx?signature=abc123');

      await generateExportSignedUrl('proj1', 'exp1', 'file.docx');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 7200 }
      );
    });
  });

  describe('generateUploadSignedUrl', () => {
    it('should generate upload signed URL', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/uploads/user1/file.pdf?signature=abc123');

      const url = await generateUploadSignedUrl('user1', 'file.pdf', 1800);

      expect(url).toBe('https://s3.example.com/test-bucket/uploads/user1/file.pdf?signature=abc123');
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 1800 }
      );
    });

    it('should use default expiration for uploads', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      (getSignedUrl as any).mockResolvedValue('https://s3.example.com/test-bucket/uploads/user1/file.pdf?signature=abc123');

      await generateUploadSignedUrl('user1', 'file.pdf');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 1800 }
      );
    });
  });
});
