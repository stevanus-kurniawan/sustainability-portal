import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

const ALLOWED_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

export class AdminUserRoleDto {
  @ApiProperty({ description: 'Single role to assign', enum: ALLOWED_ROLES })
  @IsString()
  @IsIn(ALLOWED_ROLES)
  role: string;
}
