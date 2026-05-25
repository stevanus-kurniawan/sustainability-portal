import { Body, Controller, Post, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';
import {
  parseProcedureScope,
  parseStorageSection,
  parseSustainabilityStorageType,
} from '@slms/shared';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { UploadStorageBodyDto } from './dto/upload-storage-body.dto';
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
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function readUploadStorageBody(req: Request): UploadStorageBodyDto {
  const raw = (req.body ?? {}) as Record<string, unknown>;
  const asString = (value: unknown): string | undefined =>
    typeof value === 'string' ? value : undefined;
  return {
    storageSection: asString(raw.storageSection),
    sustainabilityType: asString(raw.sustainabilityType),
    procedureScope: asString(raw.procedureScope),
    operationalUnitFolder: asString(raw.operationalUnitFolder),
  };
}

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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        storageSection: { type: 'string' },
        sustainabilityType: { type: 'string' },
        procedureScope: { type: 'string' },
        operationalUnitFolder: { type: 'string' },
      },
    },
  })
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

    if (!this.uploadService.isStorageConfigured()) {
      return {
        key: null,
        message:
          'Storage is not configured. Set STORAGE_ROOT_PATH and ensure the storage mount is writable.',
      };
    }

    const storageBody = readUploadStorageBody(req);
    const section = parseStorageSection(storageBody.storageSection);
    let folderPath: string | null = null;

    if (section) {
      folderPath = this.uploadService.resolveFolderPath({
        section,
        sustainabilityType: parseSustainabilityStorageType(storageBody.sustainabilityType) ?? undefined,
        procedureScope: parseProcedureScope(storageBody.procedureScope) ?? undefined,
        operationalUnitFolder: storageBody.operationalUnitFolder?.trim() || undefined,
      });
      if (!folderPath) {
        return {
          key: null,
          message:
            'Invalid storage folder context. Select required fields (e.g. operational unit, procedure source) before uploading.',
        };
      }
    }

    const key = this.uploadService.generateUploadKey(file.originalname, folderPath);

    const result = await this.uploadService.uploadStream(
      key,
      Readable.from(file.buffer),
      file.size,
      file.mimetype,
    );
    if (!result) {
      return {
        key: null,
        message: 'Upload to storage failed. Check storage configuration and folder permissions.',
      };
    }
    return { key: result };
  }
}
