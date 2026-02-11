import { randomUUID } from 'crypto';
import { Readable } from 'stream';
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

  /** Generate a unique key for uploads (uploads/${uuid}${ext}). */
  generateUploadKey(ext: string): string {
    return `uploads/${randomUUID()}${ext}`;
  }

  async getPresignedPutUrl(fileName: string, contentType?: string): Promise<{ url: string; key: string } | null> {
    if (!this.client) return null;
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    const key = this.generateUploadKey(ext);
    try {
      const url = await this.client.presignedPutObject(this.bucket, key, 60 * 15);
      return { url, key };
    } catch (err) {
      this.logger.error('MinIO presign failed', err);
      return null;
    }
  }

  /**
   * Upload a file stream to MinIO. Use this when the client cannot reach MinIO directly
   * (e.g. presigned URL uses internal host like minio:9000). Returns the object key or null.
   */
  async uploadStream(
    key: string,
    stream: Readable,
    size: number,
    contentType?: string,
  ): Promise<string | null> {
    if (!this.client) return null;
    try {
      const meta: Record<string, string> = {};
      if (contentType) meta['Content-Type'] = contentType;
      await this.client.putObject(this.bucket, key, stream, size, meta);
      return key;
    } catch (err) {
      this.logger.error('MinIO putObject failed', err);
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

  /**
   * Stream object from MinIO for inline preview. Returns { stream, contentType } or null.
   * Caller should pipe stream to response with Content-Disposition: inline.
   */
  async getObjectStream(key: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
    if (!this.client) return null;
    try {
      const stream = await this.client.getObject(this.bucket, key);
      let contentType = 'application/octet-stream';
      try {
        const stat = await this.client.statObject(this.bucket, key);
        const ct = stat.metaData?.['content-type'] ?? stat.metaData?.['Content-Type'];
        if (ct) {
          contentType = String(ct);
        } else if (key.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (key.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
          const ext = key.toLowerCase().slice(key.lastIndexOf('.'));
          contentType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        }
      } catch {
        if (key.toLowerCase().endsWith('.pdf')) contentType = 'application/pdf';
      }
      return { stream, contentType };
    } catch (err) {
      this.logger.error('MinIO getObject failed', err);
      return null;
    }
  }

  getPublicUrl(key: string): string {
    const base = this.config.get<string>('minio.publicUrl') || `http://localhost:9000/${this.bucket}`;
    return base.endsWith('/') ? `${base}${key}` : `${base}/${key}`;
  }
}
