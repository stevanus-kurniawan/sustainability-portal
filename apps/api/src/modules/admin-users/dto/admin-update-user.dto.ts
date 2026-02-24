import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Role names (replaces existing). ADMIN cannot assign SUPER_ADMIN.',
    example: ['USER'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];
}
