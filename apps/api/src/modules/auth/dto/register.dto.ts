import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

const ALLOWED_DOMAIN = '@energi-up.com';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1, { message: 'Full name is required' })
  fullName: string;

  @ApiProperty({ example: 'jane.doe@energi-up.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

export const REGISTRATION_ALLOWED_DOMAIN = ALLOWED_DOMAIN;
