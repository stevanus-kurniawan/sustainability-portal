import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { VALIDATION, VALIDATION_MESSAGES } from '@slms/shared';

const ALLOWED_DOMAIN = '@energi-up.com';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1, { message: 'Full name is required' })
  fullName: string;

  @ApiProperty({ example: 'jane.doe@energi-up.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd!',
    minLength: VALIDATION.PASSWORD.MIN_LENGTH,
    description:
      'At least 10 characters including uppercase, lowercase, number, and special character.',
  })
  @IsString()
  @MinLength(VALIDATION.PASSWORD.MIN_LENGTH, {
    message: VALIDATION_MESSAGES.MIN_LENGTH(VALIDATION.PASSWORD.MIN_LENGTH),
  })
  @Matches(VALIDATION.PASSWORD.PATTERN, {
    message: VALIDATION_MESSAGES.PASSWORD_WEAK,
  })
  password: string;
}

export const REGISTRATION_ALLOWED_DOMAIN = ALLOWED_DOMAIN;
