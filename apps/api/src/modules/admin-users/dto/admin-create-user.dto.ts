import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean, IsArray, IsEnum, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

const ALLOWED_ROLES = ['USER', 'ADMIN', 'SUPER_ADMIN'];

export class AdminCreateUserDto {
  @ApiProperty({ example: 'visitor@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiProperty({
    description: 'Initial password for the user (share securely)',
    minLength: 8,
    example: 'SecurePass1!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  temporaryPassword: string;

  @ApiPropertyOptional({ enum: UserStatus, default: 'PENDING_VERIFICATION' })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Role names (e.g. USER for portal visitor). ADMIN cannot assign SUPER_ADMIN.',
    type: [String],
    example: ['USER'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  @ApiPropertyOptional({
    description: 'If true, send verification email; if false, mark email verified so user can log in immediately',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sendVerificationEmail?: boolean;
}
