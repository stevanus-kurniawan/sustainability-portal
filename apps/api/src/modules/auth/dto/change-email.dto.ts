import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'old@energi-up.com' })
  @IsString()
  @IsEmail()
  currentEmail: string;

  @ApiProperty({ example: 'new@energi-up.com' })
  @IsString()
  @IsEmail()
  newEmail: string;
}

