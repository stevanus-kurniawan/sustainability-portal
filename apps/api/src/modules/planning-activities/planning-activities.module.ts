import { Module } from '@nestjs/common';
import { PlanningActivitiesController } from './planning-activities.controller';
import { PlanningActivitiesService } from './planning-activities.service';

@Module({
  controllers: [PlanningActivitiesController],
  providers: [PlanningActivitiesService],
})
export class PlanningActivitiesModule {}
