import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { documentDataForResponse, type DocumentWithRelations } from '../../common/document-mapper';
import { toStrapiLike } from '../../common/response';
import { paginationMeta, wrapPaginated } from '../../common/response';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const documentInclude = {
  category: true,
  tags: { include: { tag: true } },
  currentVersion: true,
} as const;

@Injectable()
export class TraceabilityService {
  private readonly prismaClient = new PrismaClient();

  constructor(private prisma: PrismaService) {}

  async findEntitiesPublic(params: {
    page?: number;
    pageSize?: number;
    entityType?: string;
    search?: string;
  }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Record<string, unknown> = {};
    if (params.entityType) where.entityType = params.entityType as 'FACTORY' | 'SUPPLIER' | 'SITE';
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { region: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.traceabilityEntity.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.traceabilityEntity.count({ where }),
    ]);
    const data = items.map((e: {
      id: number;
      entityType: string;
      name: string;
      code: string | null;
      region: string | null;
    }) =>
      toStrapiLike(e.id, {
        entityType: e.entityType,
        name: e.name,
        code: e.code,
        region: e.region,
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findRecordsPublic(params: {
    page?: number;
    pageSize?: number;
    entityType?: string;
    recordType?: string;
    search?: string;
  }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const entityAnd: Array<Record<string, unknown>> = [];
    if (params.entityType) {
      entityAnd.push({ entityType: params.entityType as 'FACTORY' | 'SUPPLIER' | 'SITE' });
    }
    if (params.search) {
      entityAnd.push({
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { code: { contains: params.search, mode: 'insensitive' } },
          { region: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }
    const where: Record<string, unknown> = {
      isPublic: true,
      ...(entityAnd.length ? { entity: { AND: entityAnd } } : {}),
    };
    if (params.recordType) where.recordType = params.recordType as 'AUDIT' | 'CHAIN_OF_CUSTODY' | 'ORIGIN';
    const [items, total] = await Promise.all([
      this.prisma.traceabilityRecord.findMany({
        where,
        include: {
          entity: true,
          evidenceDocument: { include: documentInclude },
        },
        orderBy: { recordDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.traceabilityRecord.count({ where }),
    ]);
    const data = items.map((r: {
      id: number;
      recordType: string;
      recordDate: Date;
      isPublic: boolean;
      entity: { id: number; entityType: string; name: string; code: string | null; region: string | null };
      evidenceDocument: unknown;
    }) =>
      toStrapiLike(r.id, {
        recordType: r.recordType,
        recordDate: r.recordDate.toISOString(),
        isPublic: r.isPublic,
        entity: {
          data: toStrapiLike(r.entity.id, {
            entityType: r.entity.entityType,
            name: r.entity.name,
            code: r.entity.code,
            region: r.entity.region,
          }),
        },
        evidenceDocument: {
          data: documentDataForResponse(r.evidenceDocument as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findAllEntitiesAdmin(params: { page?: number; pageSize?: number }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const [items, total] = await Promise.all([
      this.prisma.traceabilityEntity.findMany({
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.traceabilityEntity.count(),
    ]);
    const data = items.map((e: {
      id: number;
      entityType: string;
      name: string;
      code: string | null;
      region: string | null;
    }) =>
      toStrapiLike(e.id, {
        entityType: e.entityType,
        name: e.name,
        code: e.code,
        region: e.region,
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async findOneEntityAdmin(id: number) {
    const e = await this.prisma.traceabilityEntity.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Traceability entity not found');
    return toStrapiLike(e.id, {
      entityType: e.entityType,
      name: e.name,
      code: e.code,
      region: e.region,
    });
  }

  async createEntity(data: {
    entityType: string;
    name: string;
    code?: string;
    region?: string;
    createdById?: string;
  }) {
    const e = await this.prisma.traceabilityEntity.create({
      data: {
        entityType: data.entityType as 'FACTORY' | 'SUPPLIER' | 'SITE',
        name: data.name,
        code: data.code,
        region: data.region,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
    return toStrapiLike(e.id, {
      entityType: e.entityType,
      name: e.name,
      code: e.code,
      region: e.region,
    });
  }

  async updateEntity(
    id: number,
    data: { name?: string; code?: string; region?: string; updatedById?: string },
  ) {
    const e = await this.prisma.traceabilityEntity.update({
      where: { id },
      data,
    });
    return toStrapiLike(e.id, {
      entityType: e.entityType,
      name: e.name,
      code: e.code,
      region: e.region,
    });
  }

  async removeEntity(id: number) {
    await this.prisma.traceabilityEntity.delete({ where: { id } });
    return { deleted: true };
  }

  async findAllRecordsAdmin(params: { page?: number; pageSize?: number }) {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const [items, total] = await Promise.all([
      this.prisma.traceabilityRecord.findMany({
        include: { entity: true, evidenceDocument: { include: documentInclude } },
        orderBy: { recordDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.traceabilityRecord.count(),
    ]);
    const data = items.map((r: {
      id: number;
      recordType: string;
      recordDate: Date;
      isPublic: boolean;
      entity: { id: number; entityType: string; name: string; code: string | null; region: string | null };
      evidenceDocument: unknown;
    }) =>
      toStrapiLike(r.id, {
        recordType: r.recordType,
        recordDate: r.recordDate.toISOString(),
        isPublic: r.isPublic,
        entity: {
          data: toStrapiLike(r.entity.id, {
            entityType: r.entity.entityType,
            name: r.entity.name,
            code: r.entity.code,
            region: r.entity.region,
          }),
        },
        evidenceDocument: {
          data: documentDataForResponse(r.evidenceDocument as unknown as DocumentWithRelations),
        },
      }),
    );
    return wrapPaginated(data, paginationMeta(total, page, pageSize));
  }

  async createRecord(data: {
    entityId: number;
    recordType: string;
    recordDate: string;
    isPublic?: boolean;
    evidenceDocumentId?: number;
    createdById?: string;
  }) {
    const r = await this.prisma.traceabilityRecord.create({
      data: {
        entityId: data.entityId,
        recordType: data.recordType as 'AUDIT' | 'CHAIN_OF_CUSTODY' | 'ORIGIN',
        recordDate: new Date(data.recordDate),
        isPublic: data.isPublic ?? true,
        evidenceDocumentId: data.evidenceDocumentId,
        createdById: data.createdById,
      },
      include: { entity: true, evidenceDocument: { include: documentInclude } },
    });
    return toStrapiLike(r.id, {
      recordType: r.recordType,
      recordDate: r.recordDate.toISOString(),
      isPublic: r.isPublic,
      entity: {
        data: toStrapiLike(r.entity.id, {
          entityType: r.entity.entityType,
          name: r.entity.name,
          code: r.entity.code,
          region: r.entity.region,
        }),
      },
evidenceDocument: {
          data: documentDataForResponse(r.evidenceDocument as unknown as DocumentWithRelations),
        },
    });
  }

  async removeRecord(id: number) {
    await this.prisma.traceabilityRecord.delete({ where: { id } });
    return { deleted: true };
  }
}
