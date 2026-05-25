import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminUserPasswordDto {
  @ApiProperty({
    description: 'New password for the visitor user',
    minLength: 8,
    example: 'NewSecurePass1!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}
