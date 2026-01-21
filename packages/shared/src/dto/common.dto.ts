/**
 * Common DTOs used across the SLMS application
 */

export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQueryDto extends PaginationQueryDto {
  search?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface IdParamDto {
  id: string;
}

export interface BulkOperationDto {
  ids: string[];
}

export interface FileUploadDto {
  file: File | Blob;
  name: string;
  type: string;
}

export interface DateRangeDto {
  startDate: string;
  endDate: string;
}
