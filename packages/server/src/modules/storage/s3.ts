import { Client } from 'minio';
import { env } from '../../config/env';

// Initialize MinIO client
const minioClient = new Client({
  endPoint: new URL(env.S3_ENDPOINT).hostname,
  port: parseInt(new URL(env.S3_ENDPOINT).port) || 9000,
  useSSL: new URL(env.S3_ENDPOINT).protocol === 'https:',
  accessKey: env.S3_ACCESS_KEY,
  secretKey: env.S3_SECRET_KEY,
});

// Ensure bucket exists
async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Created bucket: ${bucketName}`);
    }
  } catch (error) {
    console.error(`Failed to ensure bucket ${bucketName} exists:`, error);
    throw error;
  }
}

// Upload file to S3
export async function uploadFile(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  try {
    await ensureBucketExists(bucketName);
    
    await minioClient.putObject(bucketName, objectName, buffer, {
      'Content-Type': contentType,
    } as any);
    
    return `${env.S3_ENDPOINT}/${bucketName}/${objectName}`;
  } catch (error) {
    console.error(`Failed to upload file ${objectName}:`, error);
    throw error;
  }
}

// Get file from S3
export async function getFile(bucketName: string, objectName: string): Promise<Buffer> {
  try {
    const stream = await minioClient.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to get file ${objectName}:`, error);
    throw error;
  }
}

// Delete file from S3
export async function deleteFile(bucketName: string, objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, objectName);
  } catch (error) {
    console.error(`Failed to delete file ${objectName}:`, error);
    throw error;
  }
}

// Check if file exists
export async function fileExists(bucketName: string, objectName: string): Promise<boolean> {
  try {
    await minioClient.statObject(bucketName, objectName);
    return true;
  } catch (error) {
    return false;
  }
}
