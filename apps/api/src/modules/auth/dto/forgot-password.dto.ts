import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@energi-up.com',
    description: 'Email address for password reset',
  })
  @IsEmail()
  email: string;
}
