import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@energi-up.com' })
  @IsString()
  @IsEmail()
  email: string;
}

