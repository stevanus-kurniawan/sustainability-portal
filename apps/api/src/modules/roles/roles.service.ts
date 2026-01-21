import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async create(data: { name: string; description?: string; permissions?: string[] }) {
    const existing = await this.prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${data.name}" already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    if (data.permissions && data.permissions.length > 0) {
      await this.assignPermissions(role.id, data.permissions);
    }

    return this.findById(role.id);
  }

  async update(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
    await this.findById(id);

    const { permissions, ...roleData } = data;

    await this.prisma.role.update({
      where: { id },
      data: roleData,
    });

    if (permissions !== undefined) {
      // Remove existing permissions
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Assign new permissions
      if (permissions.length > 0) {
        await this.assignPermissions(id, permissions);
      }
    }

    return this.findById(id);
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermissions(roleId: string, permissionCodes: string[]) {
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    if (permissions.length !== permissionCodes.length) {
      const foundCodes = permissions.map((p) => p.code);
      const missing = permissionCodes.filter((c) => !foundCodes.includes(c));
      throw new NotFoundException(`Permissions not found: ${missing.join(', ')}`);
    }

    await this.prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });
  }
}
