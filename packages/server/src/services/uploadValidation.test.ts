import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUpload, validateUploadRequest } from './uploadValidation';
import { MultipartFile } from '@fastify/multipart';

// Mock environment
vi.mock('../config/env', () => ({
  env: {
    CLAMAV_ENABLED: false,
    NODE_ENV: 'test'
  }
}));

// Mock MultipartFile
interface MockMultipartFile {
  filename: string;
  mimetype: string;
  file: {
    bytesRead: number;
  };
  toBuffer: () => Promise<Buffer>;
}

const createMockFile = (overrides: Partial<MockMultipartFile> = {}): MultipartFile => {
  const mockFile: MockMultipartFile = {
    filename: 'test.pdf',
    mimetype: 'application/pdf',
    file: {
      bytesRead: 1024
    },
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('test content')),
    ...overrides
  };
  
  return mockFile as MultipartFile;
};

describe('uploadValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUpload', () => {
    it('should validate a valid PDF file', async () => {
      const file = createMockFile({
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        file: { bytesRead: 1024 }
      });

      const result = await validateUpload(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedFilename).toBe('test.pdf');
    });

    it('should reject file that is too large', async () => {
      const file = createMockFile({
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        file: { bytesRead: 20 * 1024 * 1024 } // 20MB
      });

      const result = await validateUpload(file, { maxSize: 10 * 1024 * 1024 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum allowed size of 10485760 bytes');
    });

    it('should reject file with invalid MIME type', async () => {
      const file = createMockFile({
        filename: 'test.exe',
        mimetype: 'application/x-executable'
      });

      const result = await validateUpload(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type application/x-executable is not allowed');
    });

    it('should reject file with invalid extension', async () => {
      const file = createMockFile({
        filename: 'test.exe',
        mimetype: 'application/pdf'
      });

      const result = await validateUpload(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File extension .exe is not allowed');
    });

    it('should sanitize filename with special characters', async () => {
      const file = createMockFile({
        filename: 'test file with spaces & symbols!.pdf'
      });

      const result = await validateUpload(file);

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBe('test_file_with_spaces___symbols_.pdf');
    });

    it('should handle EICAR test file in development', async () => {
      vi.doMock('../config/env', () => ({
        env: {
          CLAMAV_ENABLED: true,
          NODE_ENV: 'development'
        }
      }));

      const file = createMockFile({
        filename: 'eicar.txt',
        mimetype: 'text/plain',
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'))
      });

      const result = await validateUpload(file, { requireVirusScan: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Virus detected: EICAR test file');
    });
  });

  describe('validateUploadRequest', () => {
    it('should validate multiple valid files', async () => {
      const files = [
        createMockFile({ filename: 'test1.pdf' }),
        createMockFile({ filename: 'test2.pdf' })
      ];

      const result = await validateUploadRequest(files);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty file list', async () => {
      const result = await validateUploadRequest([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No files provided');
    });

    it('should reject too many files', async () => {
      const files = Array.from({ length: 15 }, (_, i) => 
        createMockFile({ filename: `test${i}.pdf` })
      );

      const result = await validateUploadRequest(files);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too many files (maximum 10 allowed)');
    });

    it('should collect errors from multiple files', async () => {
      const files = [
        createMockFile({ 
          filename: 'test1.pdf',
          file: { bytesRead: 20 * 1024 * 1024 } // Too large
        }),
        createMockFile({ 
          filename: 'test2.exe', // Invalid extension
          mimetype: 'application/x-executable'
        })
      ];

      const result = await validateUploadRequest(files, { maxSize: 10 * 1024 * 1024 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('test1.pdf: File size exceeds maximum allowed size');
      expect(result.errors[1]).toContain('test2.exe: File type application/x-executable is not allowed');
    });
  });
});
