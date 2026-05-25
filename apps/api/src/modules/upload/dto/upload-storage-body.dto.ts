import { IsOptional, IsString } from 'class-validator';

export class UploadStorageBodyDto {
  @IsOptional()
  @IsString()
  storageSection?: string;

  @IsOptional()
  @IsString()
  sustainabilityType?: string;

  @IsOptional()
  @IsString()
  procedureScope?: string;

  @IsOptional()
  @IsString()
  operationalUnitFolder?: string;
}
