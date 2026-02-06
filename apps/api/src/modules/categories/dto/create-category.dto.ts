import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Certificate' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'certificate' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'sustainability' })
  @IsString()
  @IsOptional()
  menuGroup?: string | null;

  @ApiPropertyOptional({ enum: ['DIRECT', 'WITH_SUBCONTENT'] })
  @IsIn(['DIRECT', 'WITH_SUBCONTENT'])
  @IsOptional()
  mode?: 'DIRECT' | 'WITH_SUBCONTENT';

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPublic?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  displayOrder?: number;
}
