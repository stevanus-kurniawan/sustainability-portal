import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DocumentType {
  POLICY = 'POLICY',
  CERTIFICATION = 'CERTIFICATION',
  LICENSE = 'LICENSE',
  GRIEVANCE = 'GRIEVANCE',
  TRACEABILITY = 'TRACEABILITY',
  GENERAL = 'GENERAL',
}

export class CreateDocumentDto {
  @ApiProperty({ example: 'Environmental Policy 2024' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category?: number;

  @ApiPropertyOptional({ description: 'Tag IDs', type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  tags?: number[];

  @ApiPropertyOptional({ description: 'Rich text description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Environmental Policy 2024 (Updated)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category?: number;

  @ApiPropertyOptional({ description: 'Tag IDs', type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  tags?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCertificationDto {
  @ApiProperty({ example: 'ISO 14001:2015' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Bureau Veritas' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ example: 'CERT-2024-001' })
  @IsOptional()
  @IsString()
  certificateNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiProperty()
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Related document ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  document?: number;
}

export class UpdateCertificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  document?: number;
}

export class CreateLicenseDto {
  @ApiProperty({ example: 'Environmental Operating Permit' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Environmental Protection Agency' })
  @IsOptional()
  @IsString()
  authority?: string;

  @ApiPropertyOptional({ example: 'LIC-2024-001' })
  @IsOptional()
  @IsString()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiProperty()
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Related document ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  document?: number;
}

export class UpdateLicenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRING', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  document?: number;
}

export class CreateGrievanceCaseDto {
  @ApiProperty({ example: 'GRV-2024-001' })
  @IsString()
  caseNo: string;

  @ApiPropertyOptional({ enum: ['WEB', 'EMAIL', 'HOTLINE', 'OTHER'] })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'IN_REVIEW', 'CLOSED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicSummary?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublicSummary?: boolean;
}

export class UpdateGrievanceCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublicSummary?: boolean;
}

export class CreateTraceabilityEntityDto {
  @ApiProperty({ enum: ['FACTORY', 'SUPPLIER', 'SITE'] })
  @IsString()
  entityType: string;

  @ApiProperty({ example: 'Main Factory Jakarta' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'FAC-001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Southeast Asia' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class UpdateTraceabilityEntityDto {
  @ApiPropertyOptional({ enum: ['FACTORY', 'SUPPLIER', 'SITE'] })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;
}

export class CreateTraceabilityRecordDto {
  @ApiProperty({ description: 'Traceability entity ID' })
  @Type(() => Number)
  @IsInt()
  entity: number;

  @ApiPropertyOptional({ enum: ['AUDIT', 'CHAIN_OF_CUSTODY', 'ORIGIN'] })
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Evidence document ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evidenceDocument?: number;
}

export class UpdateTraceabilityRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evidenceDocument?: number;
}
