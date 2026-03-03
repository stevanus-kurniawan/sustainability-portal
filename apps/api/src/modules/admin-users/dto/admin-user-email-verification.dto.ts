import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminUserEmailVerificationDto {
  @ApiProperty({
    description: 'Whether the user email is verified',
    example: true,
  })
  @IsBoolean()
  emailVerified: boolean;
}
