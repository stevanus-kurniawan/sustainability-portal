import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;
}

export class LibraryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Tag slugs (comma-separated)',
    example: 'policy,sustainability',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Document type',
    enum: ['POLICY', 'CERTIFICATION', 'LICENSE', 'GRIEVANCE', 'TRACEABILITY', 'GENERAL'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Search keyword in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['title', 'publishedAt', 'createdAt'],
    default: 'publishedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'publishedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CertificationQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Status filter',
    enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class LicenseQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Status filter',
    enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class GrievanceQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Status filter',
    enum: ['OPEN', 'IN_REVIEW', 'CLOSED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class TraceabilityQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Entity type filter',
    enum: ['FACTORY', 'SUPPLIER', 'SITE'],
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Record type filter',
    enum: ['AUDIT', 'CHAIN_OF_CUSTODY', 'ORIGIN'],
  })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminDocumentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Document type',
    enum: ['POLICY', 'CERTIFICATION', 'LICENSE', 'GRIEVANCE', 'TRACEABILITY', 'GENERAL'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Published status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Public visibility' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;
}
