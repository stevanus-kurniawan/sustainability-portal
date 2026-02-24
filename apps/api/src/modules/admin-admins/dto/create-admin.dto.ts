import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsIn, MinLength } from 'class-validator';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Temporary password (user can change after first login)', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  temporaryPassword: string;

  @ApiPropertyOptional({ enum: ADMIN_ROLES, default: 'ADMIN' })
  @IsString()
  @IsIn(ADMIN_ROLES)
  @IsOptional()
  role?: string = 'ADMIN';
}
