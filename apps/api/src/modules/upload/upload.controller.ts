import { Body, Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { UploadService } from './upload.service';

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
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ key: string } | { key: null; message: string }> {
    if (!file) {
      return { key: null, message: 'No file provided' };
    }
    const ext = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '';
    const key = this.uploadService.generateUploadKey(ext);
    const result = await this.uploadService.uploadStream(
      key,
      Readable.from(file.buffer),
      file.size,
      file.mimetype,
    );
    if (!result) return { key: null, message: 'Upload to storage failed' };
    return { key: result };
  }
}
