import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { CategoriesModule } from '../categories/categories.module';
import { SubContentsModule } from '../sub-contents/sub-contents.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { DocumentsModule } from '../documents/documents.module';
import { LicensesModule } from '../licenses/licenses.module';
import { TagsModule } from '../tags/tags.module';
import { TraceabilityModule } from '../traceability/traceability.module';
import { UploadModule } from '../upload/upload.module';
import { GrievancesModule } from '../grievances/grievances.module';

@Module({
  imports: [
    CategoriesModule,
    UploadModule,
    SubContentsModule,
    TagsModule,
    DocumentsModule,
    CertificationsModule,
    LicensesModule,
    GrievancesModule,
    TraceabilityModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
