import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { CategoriesModule } from '../categories/categories.module';
import { CertificationsModule } from '../certifications/certifications.module';
import { DocumentsModule } from '../documents/documents.module';
import { GrievancesModule } from '../grievances/grievances.module';
import { LicensesModule } from '../licenses/licenses.module';
import { TagsModule } from '../tags/tags.module';
import { TraceabilityModule } from '../traceability/traceability.module';

@Module({
  imports: [
    CategoriesModule,
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
