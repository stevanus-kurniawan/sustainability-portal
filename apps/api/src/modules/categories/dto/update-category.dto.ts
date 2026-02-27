import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Certificate' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'certificate' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'sustainability', description: 'procedure | sustainability | compliance' })
  @IsString()
  @IsOptional()
  menuGroup?: string | null;

  @ApiPropertyOptional({ enum: ['DIRECT', 'WITH_SUBCONTENT'], example: 'WITH_SUBCONTENT' })
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
