import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private client: Minio.Client | null = null;
  private bucket: string = 'slms-docs';

  constructor(private config: ConfigService) {
    const endPoint = this.config.get<string>('minio.endPoint');
    const port = this.config.get<number>('minio.port');
    const useSSL = this.config.get<boolean>('minio.useSSL');
    const accessKey = this.config.get<string>('minio.accessKey');
    const secretKey = this.config.get<string>('minio.secretKey');
    this.bucket = this.config.get<string>('minio.bucket') ?? 'slms-docs';
    if (endPoint && accessKey && secretKey) {
      this.client = new Minio.Client({
        endPoint,
        port: port ?? 9000,
        useSSL: useSSL ?? false,
        accessKey,
        secretKey,
      });
    } else {
      this.logger.warn('MinIO not configured; upload presigning disabled');
    }
  }

  async getPresignedPutUrl(fileName: string, contentType?: string): Promise<{ url: string; key: string } | null> {
    if (!this.client) return null;
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    const key = `uploads/${randomUUID()}${ext}`;
    try {
      const url = await this.client.presignedPutObject(this.bucket, key, 60 * 15);
      return { url, key };
    } catch (err) {
      this.logger.error('MinIO presign failed', err);
      return null;
    }
  }

  async getPresignedGetUrl(key: string, expirySeconds = 3600): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.presignedGetObject(this.bucket, key, expirySeconds);
    } catch (err) {
      this.logger.error('MinIO presigned GET failed', err);
      return null;
    }
  }

  getPublicUrl(key: string): string {
    const base = this.config.get<string>('minio.publicUrl') || `http://localhost:9000/${this.bucket}`;
    return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
  }
}
