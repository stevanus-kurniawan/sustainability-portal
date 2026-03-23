import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PlanningActivityStatus } from '@prisma/client';

export class UpdatePlanningActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PlanningActivityStatus)
  status?: PlanningActivityStatus;

  /** Omit to leave unchanged; send null to clear assignee. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  assigneeAdminId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}
