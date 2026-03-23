import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { PlanningActivitiesService } from './planning-activities.service';
import { CreatePlanningActivityDto } from './dto/create-planning-activity.dto';
import { UpdatePlanningActivityDto } from './dto/update-planning-activity.dto';

@ApiTags('admin/planning-activities')
@Controller('admin/planning-activities')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class PlanningActivitiesController {
  constructor(private readonly service: PlanningActivitiesService) {}

  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(from, to);
  }

  /** Active admins with ADMIN or SUPER_ADMIN role (for assignee dropdown). */
  @Get('assignees')
  listAssignees() {
    return this.service.listAssignees();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreatePlanningActivityDto) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePlanningActivityDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
