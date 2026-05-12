import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OperationalUnitsController } from './operational-units.controller';
import { OperationalUnitsPublicController } from './operational-units-public.controller';
import { OperationalUnitsService } from './operational-units.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperationalUnitsController, OperationalUnitsPublicController],
  providers: [OperationalUnitsService],
  exports: [OperationalUnitsService],
})
export class OperationalUnitsModule {}
