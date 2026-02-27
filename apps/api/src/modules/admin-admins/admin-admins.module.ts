import { Module } from '@nestjs/common';
import { AdminAdminsController } from './admin-admins.controller';
import { AdminAdminsService } from './admin-admins.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AdminAuthModule, AuditLogsModule],
  controllers: [AdminAdminsController],
  providers: [AdminAdminsService],
  exports: [AdminAdminsService],
})
export class AdminAdminsModule {}
