import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}
