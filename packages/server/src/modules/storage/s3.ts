import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from '../../config/env';

// One client to rule them all (AWS SDK v3 with MinIO support)
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY
  },
  forcePathStyle: true // MinIO compatibility
});

// Upload file to S3
export async function uploadFile(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectName,
      Body: buffer,
      ContentType: contentType,
    });
    
    await s3.send(command);
    return `${env.S3_ENDPOINT}/${bucketName}/${objectName}`;
  } catch (error) {
    console.error(`Failed to upload file ${objectName}:`, error);
    throw error;
  }
}

// Get file from S3
export async function getFile(bucketName: string, objectName: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    });
    
    const response = await s3.send(command);
    const chunks: Buffer[] = [];
    
    if (!response.Body) {
      throw new Error('No body in response');
    }
    
    return new Promise((resolve, reject) => {
      if (response.Body && 'on' in response.Body) {
        const stream = response.Body as NodeJS.ReadableStream;
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      } else {
        reject(new Error('Invalid response body type'));
      }
    });
  } catch (error) {
    console.error(`Failed to get file ${objectName}:`, error);
    throw error;
  }
}

// Delete file from S3
export async function deleteFile(bucketName: string, objectName: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    });
    
    await s3.send(command);
  } catch (error) {
    console.error(`Failed to delete file ${objectName}:`, error);
    throw error;
  }
}

// Check if file exists
export async function fileExists(bucketName: string, objectName: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    });
    
    await s3.send(command);
    return true;
  } catch (error) {
    return false;
  }
}
