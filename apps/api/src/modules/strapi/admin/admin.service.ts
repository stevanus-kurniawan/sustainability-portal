import { Injectable } from '@nestjs/common';
import {
  StrapiClientService,
  StrapiQueryParams,
} from '../strapi-client.service';
import { AdminDocumentQueryDto } from '../dto/query.dto';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateCertificationDto,
  UpdateCertificationDto,
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateGrievanceCaseDto,
  UpdateGrievanceCaseDto,
  CreateTraceabilityEntityDto,
  UpdateTraceabilityEntityDto,
  CreateTraceabilityRecordDto,
  UpdateTraceabilityRecordDto,
} from '../dto/create-document.dto';
import { PaginationDto } from '../dto/query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly strapiClient: StrapiClientService) {}

  // ==========================================
  // Documents CRUD
  // ==========================================

  async getDocuments(query: AdminDocumentQueryDto) {
    const filters: Record<string, any> = {};

    if (query.categoryId) {
      filters.category = { id: { $eq: query.categoryId } };
    }

    if (query.type) {
      filters.type = { $eq: query.type };
    }

    if (query.isPublished !== undefined) {
      filters.isPublished = { $eq: query.isPublished };
    }

    if (query.isPublic !== undefined) {
      filters.isPublic = { $eq: query.isPublic };
    }

    if (query.search) {
      filters.$or = [
        { title: { $containsi: query.search } },
        { description: { $containsi: query.search } },
      ];
    }

    const params: StrapiQueryParams = {
      filters,
      populate: {
        category: { fields: ['id', 'name', 'slug'] },
        tags: { fields: ['id', 'name', 'slug'] },
        currentVersion: {
          populate: {
            file: true,
          },
        },
      },
      sort: ['updatedAt:desc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('documents', params);
  }

  async getDocument(id: number) {
    const params: StrapiQueryParams = {
      populate: {
        category: true,
        tags: true,
        currentVersion: {
          populate: {
            file: true,
          },
        },
      },
    };

    return this.strapiClient.get(`documents/${id}`, params);
  }

  async createDocument(data: CreateDocumentDto) {
    return this.strapiClient.create('documents', data);
  }

  async updateDocument(id: number, data: UpdateDocumentDto) {
    return this.strapiClient.update('documents', id, data);
  }

  async deleteDocument(id: number) {
    return this.strapiClient.delete('documents', id);
  }

  async publishDocument(id: number) {
    return this.strapiClient.update('documents', id, {
      isPublished: true,
      publishedAt: new Date().toISOString(),
    });
  }

  async unpublishDocument(id: number) {
    return this.strapiClient.update('documents', id, {
      isPublished: false,
      publishedAt: null,
    });
  }

  // ==========================================
  // Certifications CRUD
  // ==========================================

  async getCertifications(query: PaginationDto & { status?: string; search?: string }) {
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
      populate: {
        document: {
          populate: {
            currentVersion: {
              populate: { file: true },
            },
          },
        },
      },
      sort: ['expiryDate:asc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('certifications', params);
  }

  async getCertification(id: number) {
    const params: StrapiQueryParams = {
      populate: {
        document: {
          populate: {
            currentVersion: {
              populate: { file: true },
            },
          },
        },
      },
    };

    return this.strapiClient.get(`certifications/${id}`, params);
  }

  async createCertification(data: CreateCertificationDto) {
    return this.strapiClient.create('certifications', data);
  }

  async updateCertification(id: number, data: UpdateCertificationDto) {
    return this.strapiClient.update('certifications', id, data);
  }

  async deleteCertification(id: number) {
    return this.strapiClient.delete('certifications', id);
  }

  // ==========================================
  // Licenses CRUD
  // ==========================================

  async getLicenses(query: PaginationDto & { status?: string; search?: string }) {
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
      populate: {
        document: {
          populate: {
            currentVersion: {
              populate: { file: true },
            },
          },
        },
      },
      sort: ['expiryDate:asc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('licenses', params);
  }

  async getLicense(id: number) {
    const params: StrapiQueryParams = {
      populate: {
        document: {
          populate: {
            currentVersion: {
              populate: { file: true },
            },
          },
        },
      },
    };

    return this.strapiClient.get(`licenses/${id}`, params);
  }

  async createLicense(data: CreateLicenseDto) {
    return this.strapiClient.create('licenses', data);
  }

  async updateLicense(id: number, data: UpdateLicenseDto) {
    return this.strapiClient.update('licenses', id, data);
  }

  async deleteLicense(id: number) {
    return this.strapiClient.delete('licenses', id);
  }

  // ==========================================
  // Grievance Cases CRUD
  // ==========================================

  async getGrievanceCases(query: PaginationDto & { status?: string; category?: string }) {
    const filters: Record<string, any> = {};

    if (query.status) {
      filters.status = { $eq: query.status };
    }

    if (query.category) {
      filters.category = { $containsi: query.category };
    }

    const params: StrapiQueryParams = {
      filters,
      populate: ['updates'],
      sort: ['receivedDate:desc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('grievance-cases', params);
  }

  async getGrievanceCase(id: number) {
    const params: StrapiQueryParams = {
      populate: {
        updates: {
          sort: ['createdAt:desc'],
        },
      },
    };

    return this.strapiClient.get(`grievance-cases/${id}`, params);
  }

  async createGrievanceCase(data: CreateGrievanceCaseDto) {
    return this.strapiClient.create('grievance-cases', data);
  }

  async updateGrievanceCase(id: number, data: UpdateGrievanceCaseDto) {
    return this.strapiClient.update('grievance-cases', id, data);
  }

  async deleteGrievanceCase(id: number) {
    return this.strapiClient.delete('grievance-cases', id);
  }

  async addGrievanceUpdate(
    grievanceCaseId: number,
    message: string,
    createdByEmail: string,
  ) {
    return this.strapiClient.create('grievance-updates', {
      grievanceCase: grievanceCaseId,
      message,
      createdByEmail,
      createdAt: new Date().toISOString(),
    });
  }

  // ==========================================
  // Traceability Entities CRUD
  // ==========================================

  async getTraceabilityEntities(
    query: PaginationDto & { entityType?: string; search?: string },
  ) {
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
      populate: ['records'],
      sort: ['name:asc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('traceability-entities', params);
  }

  async getTraceabilityEntity(id: number) {
    const params: StrapiQueryParams = {
      populate: {
        records: {
          populate: {
            evidenceDocument: {
              populate: {
                currentVersion: {
                  populate: { file: true },
                },
              },
            },
          },
        },
      },
    };

    return this.strapiClient.get(`traceability-entities/${id}`, params);
  }

  async createTraceabilityEntity(data: CreateTraceabilityEntityDto) {
    return this.strapiClient.create('traceability-entities', data);
  }

  async updateTraceabilityEntity(id: number, data: UpdateTraceabilityEntityDto) {
    return this.strapiClient.update('traceability-entities', id, data);
  }

  async deleteTraceabilityEntity(id: number) {
    return this.strapiClient.delete('traceability-entities', id);
  }

  // ==========================================
  // Traceability Records CRUD
  // ==========================================

  async getTraceabilityRecords(
    query: PaginationDto & { entityId?: number; recordType?: string; isPublic?: boolean },
  ) {
    const filters: Record<string, any> = {};

    if (query.entityId) {
      filters.entity = { id: { $eq: query.entityId } };
    }

    if (query.recordType) {
      filters.recordType = { $eq: query.recordType };
    }

    if (query.isPublic !== undefined) {
      filters.isPublic = { $eq: query.isPublic };
    }

    const params: StrapiQueryParams = {
      filters,
      populate: {
        entity: { fields: ['id', 'entityType', 'name', 'code'] },
        evidenceDocument: {
          populate: {
            currentVersion: {
              populate: { file: true },
            },
          },
        },
      },
      sort: ['recordDate:desc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('traceability-records', params);
  }

  async getTraceabilityRecord(id: number) {
    const params: StrapiQueryParams = {
      populate: {
        entity: true,
        evidenceDocument: {
          populate: {
            currentVersion: {
              populate: { file: true },
            },
          },
        },
      },
    };

    return this.strapiClient.get(`traceability-records/${id}`, params);
  }

  async createTraceabilityRecord(data: CreateTraceabilityRecordDto) {
    return this.strapiClient.create('traceability-records', data);
  }

  async updateTraceabilityRecord(id: number, data: UpdateTraceabilityRecordDto) {
    return this.strapiClient.update('traceability-records', id, data);
  }

  async deleteTraceabilityRecord(id: number) {
    return this.strapiClient.delete('traceability-records', id);
  }

  // ==========================================
  // Categories & Tags Management
  // ==========================================

  async getCategories(query: PaginationDto) {
    const params: StrapiQueryParams = {
      sort: ['displayOrder:asc', 'name:asc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('categories', params);
  }

  async createCategory(data: { name: string; slug?: string; isPublic?: boolean; displayOrder?: number }) {
    return this.strapiClient.create('categories', data);
  }

  async updateCategory(id: number, data: { name?: string; isPublic?: boolean; displayOrder?: number }) {
    return this.strapiClient.update('categories', id, data);
  }

  async deleteCategory(id: number) {
    return this.strapiClient.delete('categories', id);
  }

  async getTags(query: PaginationDto) {
    const params: StrapiQueryParams = {
      sort: ['name:asc'],
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
      },
    };

    return this.strapiClient.get('tags', params);
  }

  async createTag(data: { name: string; slug?: string }) {
    return this.strapiClient.create('tags', data);
  }

  async updateTag(id: number, data: { name?: string }) {
    return this.strapiClient.update('tags', id, data);
  }

  async deleteTag(id: number) {
    return this.strapiClient.delete('tags', id);
  }
}
