import { Injectable, Logger } from '@nestjs/common';
import {
  StrapiClientService,
  StrapiQueryParams,
  StrapiResponse,
} from '../strapi-client.service';
import {
  PaginationDto,
  LibraryQueryDto,
  CertificationQueryDto,
  LicenseQueryDto,
  GrievanceQueryDto,
  TraceabilityQueryDto,
} from '../dto/query.dto';

// Default empty response for graceful fallback
const emptyResponse = <T>(): StrapiResponse<T[]> => ({
  data: [] as T[],
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      pageCount: 0,
      total: 0,
    },
  },
});

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(private readonly strapiClient: StrapiClientService) {}

  /**
   * Get published policies
   * Documents with type=POLICY, isPublished=true, isPublic=true
   */
  async getPolicies(query: PaginationDto) {
    try {
      const params: StrapiQueryParams = {
        filters: {
          type: { $eq: 'POLICY' },
          isPublished: { $eq: true },
          isPublic: { $eq: true },
        },
        populate: ['category', 'tags', 'currentVersion.file'],
        sort: ['publishedAt:desc'],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('documents', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch policies from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get published certifications
   */
  async getCertifications(query: CertificationQueryDto) {
    try {
      const filters: Record<string, any> = {};

      if (query.status) {
        filters.status = { $eq: query.status };
      }

      if (query.search) {
        filters.$or = [
          { name: { $containsi: query.search } },
          { issuer: { $containsi: query.search } },
          { certificateNo: { $containsi: query.search } },
        ];
      }

      const params: StrapiQueryParams = {
        filters,
        populate: ['document.currentVersion.file'],
        sort: ['expiryDate:asc'],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('certifications', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch certifications from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get published licenses
   */
  async getLicenses(query: LicenseQueryDto) {
    try {
      const filters: Record<string, any> = {};

      if (query.status) {
        filters.status = { $eq: query.status };
      }

      if (query.search) {
        filters.$or = [
          { name: { $containsi: query.search } },
          { authority: { $containsi: query.search } },
          { licenseNo: { $containsi: query.search } },
        ];
      }

      const params: StrapiQueryParams = {
        filters,
        populate: ['document.currentVersion.file'],
        sort: ['expiryDate:asc'],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('licenses', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch licenses from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get document library
   * Documents where isPublished=true AND isPublic=true
   * With filtering by category, tags, type, and search
   */
  async getLibrary(query: LibraryQueryDto) {
    try {
      const filters: Record<string, any> = {
        isPublished: { $eq: true },
        isPublic: { $eq: true },
      };

      // Filter by category slug
      if (query.category) {
        filters.category = {
          slug: { $eq: query.category },
        };
      }

      // Filter by tag slugs
      if (query.tags && query.tags.length > 0) {
        filters.tags = {
          slug: { $in: query.tags },
        };
      }

      // Filter by document type
      if (query.type) {
        filters.type = { $eq: query.type };
      }

      // Search in title and description
      if (query.search) {
        filters.$or = [
          { title: { $containsi: query.search } },
          { description: { $containsi: query.search } },
        ];
      }

      // Build sort
      const sortField = query.sortBy || 'publishedAt';
      const sortOrder = query.sortOrder || 'desc';
      const sort = [`${sortField}:${sortOrder}`];

      const params: StrapiQueryParams = {
        filters,
        populate: {
          category: { fields: ['name', 'slug'] },
          tags: { fields: ['name', 'slug'] },
          currentVersion: {
            populate: {
              file: { fields: ['name', 'url', 'mime', 'size'] },
            },
          },
        },
        sort,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('documents', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch library from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get single document by ID (only if public and published)
   */
  async getDocument(id: number) {
    try {
      const params: StrapiQueryParams = {
        filters: {
          id: { $eq: id },
          isPublished: { $eq: true },
          isPublic: { $eq: true },
        },
        populate: {
          category: { fields: ['name', 'slug'] },
          tags: { fields: ['name', 'slug'] },
          currentVersion: {
            populate: {
              file: true,
            },
          },
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic(`documents/${id}`, params);
    } catch (error) {
      this.logger.warn(`Failed to fetch document ${id} from Strapi: ${error.message}`);
      return { data: null };
    }
  }

  /**
   * Get public grievances (only those with isPublicSummary=true)
   */
  async getGrievances(query: GrievanceQueryDto) {
    try {
      const filters: Record<string, any> = {
        isPublicSummary: { $eq: true },
      };

      if (query.status) {
        filters.status = { $eq: query.status };
      }

      if (query.category) {
        filters.category = { $containsi: query.category };
      }

      const params: StrapiQueryParams = {
        filters,
        fields: ['caseNo', 'status', 'category', 'receivedDate', 'publicSummary'],
        sort: ['receivedDate:desc'],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('grievance-cases', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch grievances from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get public traceability records
   */
  async getTraceability(query: TraceabilityQueryDto) {
    try {
      const filters: Record<string, any> = {
        isPublic: { $eq: true },
      };

      if (query.entityType) {
        filters.entity = {
          entityType: { $eq: query.entityType },
        };
      }

      if (query.recordType) {
        filters.recordType = { $eq: query.recordType };
      }

      if (query.search) {
        filters.entity = {
          ...filters.entity,
          $or: [
            { name: { $containsi: query.search } },
            { code: { $containsi: query.search } },
          ],
        };
      }

      const params: StrapiQueryParams = {
        filters,
        populate: {
          entity: { fields: ['entityType', 'name', 'code', 'region'] },
          evidenceDocument: {
            populate: {
              currentVersion: {
                populate: {
                  file: { fields: ['name', 'url'] },
                },
              },
            },
          },
        },
        sort: ['recordDate:desc'],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('traceability-records', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch traceability from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get traceability entities
   */
  async getTraceabilityEntities(query: TraceabilityQueryDto) {
    try {
      const filters: Record<string, any> = {};

      if (query.entityType) {
        filters.entityType = { $eq: query.entityType };
      }

      if (query.search) {
        filters.$or = [
          { name: { $containsi: query.search } },
          { code: { $containsi: query.search } },
          { region: { $containsi: query.search } },
        ];
      }

      const params: StrapiQueryParams = {
        filters,
        sort: ['name:asc'],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
        },
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('traceability-entities', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch traceability entities from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get categories for filtering
   */
  async getCategories() {
    try {
      const params: StrapiQueryParams = {
        filters: {
          isPublic: { $eq: true },
        },
        sort: ['displayOrder:asc', 'name:asc'],
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('categories', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch categories from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }

  /**
   * Get tags for filtering
   */
  async getTags() {
    try {
      const params: StrapiQueryParams = {
        sort: ['name:asc'],
        publicationState: 'live',
      };

      return await this.strapiClient.getPublic('tags', params);
    } catch (error) {
      this.logger.warn(`Failed to fetch tags from Strapi: ${error.message}`);
      return emptyResponse();
    }
  }
}
