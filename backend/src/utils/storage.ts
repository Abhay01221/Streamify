import * as Minio from 'minio';
import { AppError } from '../middleware/errorHandler';
import { logger } from './logger';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const BUCKET_NAME = 'coders-avatars';

const ensureBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      // Set public read policy
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
        }],
      });
      await minioClient.setBucketPolicy(BUCKET_NAME, policy);
      logger.info(`Created MinIO bucket: ${BUCKET_NAME}`);
    }
  } catch (err) {
    logger.warn('MinIO not available, using placeholder avatars:', err);
  }
};

if (process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY) void ensureBucket();

export const uploadAvatar = async (
  userId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> => {
  if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) throw new AppError('Avatar storage is not configured', 503);
  const ext = mimeType.split('/')[1];
  const objectName = `avatars/${userId}.${ext}`;

  try {
    await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    return `http://${endpoint}:${port}/${BUCKET_NAME}/${objectName}`;
  } catch (err) {
    logger.warn('MinIO upload failed, using placeholder:', err);
    throw new AppError('Avatar storage unavailable', 503);
  }
};

export default minioClient;
