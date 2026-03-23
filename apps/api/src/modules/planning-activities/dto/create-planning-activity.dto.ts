import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PlanningActivityStatus } from '@prisma/client';

export class CreatePlanningActivityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(PlanningActivityStatus)
  status?: PlanningActivityStatus;

  @IsOptional()
  @IsUUID()
  assigneeAdminId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}
