import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const ADMIN_STATUSES = ['ACTIVE', 'INACTIVE'];

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ADMIN_ROLES })
  @IsString()
  @IsIn(ADMIN_ROLES)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ enum: ADMIN_STATUSES, description: 'Set INACTIVE to disable admin access' })
  @IsString()
  @IsIn(ADMIN_STATUSES)
  @IsOptional()
  status?: string;
}
