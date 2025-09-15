import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

let s3Client: S3Client | null = null;

/**
 * Get S3 client instance
 */
function getS3Client(): S3Client | null {
  if (!s3Client && env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_REGION) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      }
    });
  }
  return s3Client;
}

/**
 * Generate signed URL for private asset
 */
export async function generateSignedUrl(
  key: string,
  expirationSeconds: number = 3600
): Promise<string> {
  const client = getS3Client();
  
  if (!client || !env.S3_BUCKET) {
    // Return placeholder URL if S3 is not configured
    return `https://example.com/placeholder/${key}`;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: expirationSeconds
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

/**
 * Validate signed URL
 */
export function validateSignedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a valid URL
    if (!urlObj.protocol.startsWith('http')) {
      return false;
    }
    
    // Check if it has required query parameters for signed URLs
    const hasSignature = urlObj.searchParams.has('X-Amz-Signature') || 
                        urlObj.searchParams.has('signature');
    
    return hasSignature;
  } catch (error) {
    return false;
  }
}

/**
 * Generate signed URL for document download
 */
export async function generateDocumentSignedUrl(
  documentId: string,
  filename: string,
  expirationSeconds: number = 3600
): Promise<string> {
  const key = `documents/${documentId}/${filename}`;
  return generateSignedUrl(key, expirationSeconds);
}

/**
 * Generate signed URL for project export
 */
export async function generateExportSignedUrl(
  projectId: string,
  exportId: string,
  filename: string,
  expirationSeconds: number = 7200 // 2 hours for exports
): Promise<string> {
  const key = `exports/${projectId}/${exportId}/${filename}`;
  return generateSignedUrl(key, expirationSeconds);
}

/**
 * Generate signed URL for user upload
 */
export async function generateUploadSignedUrl(
  userId: string,
  filename: string,
  expirationSeconds: number = 1800 // 30 minutes for uploads
): Promise<string> {
  const key = `uploads/${userId}/${filename}`;
  return generateSignedUrl(key, expirationSeconds);
}
