import { createWriteStream, createReadStream, existsSync } from 'fs';
import { mkdir, access, constants as fsConstants } from 'fs/promises';
import { randomUUID } from 'crypto';
import { dirname, resolve, sep } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildStorageFileKey,
  buildStorageFileName,
  isValidStorageFileKey,
  resolveStorageFolderPath,
  type StorageFolderInput,
} from '@slms/shared';

export type { StorageFolderInput };

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly storageRoot: string;

  constructor(private config: ConfigService) {
    this.storageRoot = this.config.get<string>('storage.rootPath') ?? '/app/storage';
    this.logger.log(`Filesystem storage at ${this.storageRoot}`);
  }

  isStorageConfigured(): boolean {
    return Boolean(this.storageRoot);
  }

  /** Generate a storage key under the given folder (or legacy uploads/ prefix). */
  generateUploadKey(originalName: string, folderPath?: string | null): string {
    const fileName = buildStorageFileName(originalName, randomUUID());
    if (folderPath) {
      return buildStorageFileKey(folderPath, fileName);
    }
    return buildStorageFileKey('uploads', fileName);
  }

  resolveFolderPath(input: StorageFolderInput): string | null {
    return resolveStorageFolderPath(input);
  }

  async getPresignedPutUrl(_fileName: string, _contentType?: string): Promise<{ url: string; key: string } | null> {
    return null;
  }

  async uploadStream(
    key: string,
    stream: Readable,
    _size: number,
    _contentType?: string,
  ): Promise<string | null> {
    if (!isValidStorageFileKey(key)) {
      this.logger.error(`Invalid storage key rejected: ${key}`);
      return null;
    }
    return this.uploadStreamFilesystem(key, stream);
  }

  private resolveFullPath(key: string): string | null {
    const root = resolve(this.storageRoot);
    const full = resolve(root, key);
    if (full !== root && !full.startsWith(root + sep)) {
      return null;
    }
    return full;
  }

  private async uploadStreamFilesystem(key: string, stream: Readable): Promise<string | null> {
    const fullPath = this.resolveFullPath(key);
    if (!fullPath) {
      this.logger.error(`Path traversal blocked for key: ${key}`);
      return null;
    }
    try {
      await mkdir(dirname(fullPath), { recursive: true });
      await pipeline(stream, createWriteStream(fullPath));
      return key;
    } catch (err) {
      this.logger.error('Filesystem upload failed', err);
      return null;
    }
  }

  async getPresignedGetUrl(_key: string, _expirySeconds = 3600): Promise<string | null> {
    return null;
  }

  async getObjectStream(key: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
    if (!isValidStorageFileKey(key)) {
      this.logger.error(`Invalid storage key for read: ${key}`);
      return null;
    }
    return this.getObjectStreamFilesystem(key);
  }

  private async getObjectStreamFilesystem(
    key: string,
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string } | null> {
    const fullPath = this.resolveFullPath(key);
    if (!fullPath || !existsSync(fullPath)) {
      this.logger.error(`File not found for key: ${key}`);
      return null;
    }
    try {
      await access(fullPath, fsConstants.R_OK);
      return { stream: createReadStream(fullPath), contentType: this.inferContentType(key) };
    } catch (err) {
      this.logger.error('Filesystem read failed', err);
      return null;
    }
  }

  private inferContentType(key: string): string {
    const lower = key.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'application/octet-stream';
  }

  getPublicUrl(_key: string): string {
    return '';
  }
}
