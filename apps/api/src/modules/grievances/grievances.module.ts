import { Module } from '@nestjs/common';
import { GrievancesController } from './grievances.controller';
import { GrievancesService } from './grievances.service';

@Module({
  controllers: [GrievancesController],
  providers: [GrievancesService],
  exports: [GrievancesService],
})
export class GrievancesModule {}
