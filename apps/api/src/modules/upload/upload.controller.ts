import { Body, Controller, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { UploadService } from './upload.service';

/** Max file size for proxy upload (25 MB). */
const MAX_UPLOAD_FILE_SIZE = 25 * 1024 * 1024;

/** Allowed MIME types for admin document uploads (PDF, images, Office). */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
]);

@ApiTags('admin/upload')
@Controller('admin/upload')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign')
  presign(
    @Body() body: { fileName: string; contentType?: string },
  ): Promise<{ url: string; key: string } | { url: null; key: null }> {
    const result = this.uploadService.getPresignedPutUrl(
      body.fileName || 'document',
      body.contentType,
    );
    return result.then((r) => r ?? { url: null, key: null });
  }

  /**
   * Proxy upload: accept file and stream it to MinIO. Use this when the client cannot
   * reach MinIO directly (e.g. presigned URL would use internal host minio:9000).
     * Limits: 25 MB max; allowed types: PDF, images, Word, Excel, PowerPoint.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
      fileFilter: (req: Request & { uploadRejectedType?: boolean }, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(null, true);
        } else {
          req.uploadRejectedType = true;
          cb(null, false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async upload(
    @Req() req: Request & { uploadRejectedType?: boolean },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ key: string } | { key: null; message: string }> {
    if (!file) {
      if (req.uploadRejectedType) {
        return {
          key: null,
          message:
            'File type not allowed. Allowed: PDF, images (JPEG, PNG, GIF, WebP, SVG), Word, Excel, PowerPoint.',
        };
      }
      return { key: null, message: 'No file provided' };
    }
    const ext = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '';
    const key = this.uploadService.generateUploadKey(ext);
    if (!this.uploadService.isStorageConfigured()) {
      return { key: null, message: 'Storage (MinIO) is not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY and ensure MinIO is running.' };
    }
    const result = await this.uploadService.uploadStream(
      key,
      Readable.from(file.buffer),
      file.size,
      file.mimetype,
    );
    if (!result) {
      return { key: null, message: 'Upload to storage failed. Check MINIO_* env and that MinIO is reachable from the API (e.g. docker compose up minio).' };
    }
    return { key: result };
  }
}
