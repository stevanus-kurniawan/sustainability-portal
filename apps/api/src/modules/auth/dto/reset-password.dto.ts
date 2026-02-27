import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { VALIDATION, VALIDATION_MESSAGES } from '@slms/shared';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Single-use reset token from the forgot-password email link',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({
    example: 'NewStr0ngP@ss!',
    minLength: VALIDATION.PASSWORD.MIN_LENGTH,
    description:
      'New password. At least 10 characters including uppercase, lowercase, number, and special character.',
  })
  @IsString()
  @MinLength(VALIDATION.PASSWORD.MIN_LENGTH, {
    message: VALIDATION_MESSAGES.MIN_LENGTH(VALIDATION.PASSWORD.MIN_LENGTH),
  })
  @Matches(VALIDATION.PASSWORD.PATTERN, {
    message: VALIDATION_MESSAGES.PASSWORD_WEAK,
  })
  newPassword: string;
}
