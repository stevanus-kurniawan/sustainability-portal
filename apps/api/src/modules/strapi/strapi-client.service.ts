import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiEntity {
  id: number;
  attributes: Record<string, any>;
}

export interface StrapiQueryParams {
  filters?: Record<string, any>;
  populate?: string | string[] | Record<string, any>;
  fields?: string[];
  sort?: string | string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    start?: number;
    limit?: number;
  };
  publicationState?: 'live' | 'preview';
  locale?: string;
}

@Injectable()
export class StrapiClientService {
  private readonly logger = new Logger(StrapiClientService.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('STRAPI_URL', 'http://localhost:1337');
    this.apiToken = this.configService.get('STRAPI_API_TOKEN', '');
  }

  /**
   * Build query string from params object
   */
  private buildQueryString(params: StrapiQueryParams): string {
    const queryParts: string[] = [];

    // Filters
    if (params.filters) {
      this.flattenFilters(params.filters, 'filters', queryParts);
    }

    // Populate
    if (params.populate) {
      if (typeof params.populate === 'string') {
        queryParts.push(`populate=${encodeURIComponent(params.populate)}`);
      } else if (Array.isArray(params.populate)) {
        params.populate.forEach((p, i) => {
          queryParts.push(`populate[${i}]=${encodeURIComponent(p)}`);
        });
      } else {
        this.flattenObject(params.populate, 'populate', queryParts);
      }
    }

    // Fields
    if (params.fields) {
      params.fields.forEach((f, i) => {
        queryParts.push(`fields[${i}]=${encodeURIComponent(f)}`);
      });
    }

    // Sort
    if (params.sort) {
      if (typeof params.sort === 'string') {
        queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
      } else {
        params.sort.forEach((s, i) => {
          queryParts.push(`sort[${i}]=${encodeURIComponent(s)}`);
        });
      }
    }

    // Pagination
    if (params.pagination) {
      Object.entries(params.pagination).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParts.push(`pagination[${key}]=${value}`);
        }
      });
    }

    // Publication state
    if (params.publicationState) {
      queryParts.push(`publicationState=${params.publicationState}`);
    }

    // Locale
    if (params.locale) {
      queryParts.push(`locale=${params.locale}`);
    }

    return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  }

  private flattenFilters(
    obj: Record<string, any>,
    prefix: string,
    result: string[],
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = `${prefix}[${key}]`;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenFilters(value, newPrefix, result);
      } else if (Array.isArray(value)) {
        value.forEach((v, i) => {
          result.push(`${newPrefix}[${i}]=${encodeURIComponent(v)}`);
        });
      } else if (value !== undefined && value !== null) {
        result.push(`${newPrefix}=${encodeURIComponent(value)}`);
      }
    }
  }

  private flattenObject(
    obj: Record<string, any>,
    prefix: string,
    result: string[],
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = `${prefix}[${key}]`;
      if (value !== null && typeof value === 'object') {
        this.flattenObject(value, newPrefix, result);
      } else if (value !== undefined && value !== null) {
        result.push(`${newPrefix}=${encodeURIComponent(value)}`);
      }
    }
  }

  /**
   * Make a public request (no authentication)
   */
  async getPublic<T>(
    endpoint: string,
    params?: StrapiQueryParams,
  ): Promise<StrapiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    const url = `${this.baseUrl}/api/${endpoint}${queryString}`;

    this.logger.debug(`GET (public): ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<StrapiResponse<T>>(url).pipe(
          catchError((error: AxiosError) => {
            this.handleAxiosError(error, 'GET', endpoint);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make an authenticated request (with API token)
   */
  async get<T>(
    endpoint: string,
    params?: StrapiQueryParams,
  ): Promise<StrapiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    const url = `${this.baseUrl}/api/${endpoint}${queryString}`;

    this.logger.debug(`GET (auth): ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<StrapiResponse<T>>(url, this.getAuthConfig())
          .pipe(
            catchError((error: AxiosError) => {
              this.handleAxiosError(error, 'GET', endpoint);
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Create a new entry
   */
  async create<T>(
    endpoint: string,
    data: Record<string, any>,
  ): Promise<StrapiResponse<T>> {
    const url = `${this.baseUrl}/api/${endpoint}`;

    this.logger.debug(`POST: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<StrapiResponse<T>>(url, { data }, this.getAuthConfig())
          .pipe(
            catchError((error: AxiosError) => {
              this.handleAxiosError(error, 'POST', endpoint);
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing entry
   */
  async update<T>(
    endpoint: string,
    id: number | string,
    data: Record<string, any>,
  ): Promise<StrapiResponse<T>> {
    const url = `${this.baseUrl}/api/${endpoint}/${id}`;

    this.logger.debug(`PUT: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .put<StrapiResponse<T>>(url, { data }, this.getAuthConfig())
          .pipe(
            catchError((error: AxiosError) => {
              this.handleAxiosError(error, 'PUT', endpoint);
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update ${endpoint}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an entry
   */
  async delete<T>(
    endpoint: string,
    id: number | string,
  ): Promise<StrapiResponse<T>> {
    const url = `${this.baseUrl}/api/${endpoint}/${id}`;

    this.logger.debug(`DELETE: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .delete<StrapiResponse<T>>(url, this.getAuthConfig())
          .pipe(
            catchError((error: AxiosError) => {
              this.handleAxiosError(error, 'DELETE', endpoint);
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to delete ${endpoint}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(
    file: Express.Multer.File,
    refData?: {
      ref: string;
      refId: string | number;
      field: string;
    },
  ): Promise<any> {
    const url = `${this.baseUrl}/api/upload`;

    const formData = new FormData();
    const uint8Array = new Uint8Array(file.buffer);
    formData.append('files', new Blob([uint8Array]), file.originalname);

    if (refData) {
      formData.append('ref', refData.ref);
      formData.append('refId', String(refData.refId));
      formData.append('field', refData.field);
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(url, formData, {
            ...this.getAuthConfig(),
            headers: {
              ...this.getAuthConfig().headers,
              'Content-Type': 'multipart/form-data',
            },
          })
          .pipe(
            catchError((error: AxiosError) => {
              this.handleAxiosError(error, 'POST', 'upload');
              throw error;
            }),
          ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
      throw error;
    }
  }

  private getAuthConfig(): AxiosRequestConfig {
    if (!this.apiToken) {
      this.logger.warn('STRAPI_API_TOKEN not configured');
    }
    return {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
      },
    };
  }

  private handleAxiosError(
    error: AxiosError,
    method: string,
    endpoint: string,
  ): void {
    const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      (error.response?.data as any)?.error?.message ||
      error.message ||
      'Strapi request failed';

    this.logger.error(
      `Strapi ${method} ${endpoint} failed: ${status} - ${message}`,
    );

    throw new HttpException(
      {
        statusCode: status,
        message: `Strapi error: ${message}`,
        error: 'Strapi Request Failed',
      },
      status,
    );
  }
}
