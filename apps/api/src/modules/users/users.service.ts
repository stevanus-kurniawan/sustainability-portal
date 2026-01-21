import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const { roles, ...userData } = createUserDto;

    // Create user
    const user = await this.prisma.user.create({
      data: userData,
    });

    // Assign roles if provided
    if (roles && roles.length > 0) {
      await this.assignRoles(user.id, roles);
    }

    return this.findById(user.id);
  }

  async findAll(params: { skip?: number; take?: number; status?: string }) {
    const { skip, take, status } = params;

    return this.prisma.user.findMany({
      where: status ? { status: status as any } : undefined,
      skip,
      take,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id); // Check if exists

    const { roles, ...userData } = updateUserDto;

    // Update user data
    await this.prisma.user.update({
      where: { id },
      data: userData,
    });

    // Update roles if provided
    if (roles !== undefined) {
      // Remove existing roles
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Assign new roles
      if (roles.length > 0) {
        await this.assignRoles(id, roles);
      }
    }

    return this.findById(id);
  }

  async remove(id: string) {
    await this.findById(id); // Check if exists

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async assignRoles(userId: string, roleNames: string[]) {
    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames } },
    });

    if (roles.length !== roleNames.length) {
      const foundNames = roles.map((r) => r.name);
      const missing = roleNames.filter((n) => !foundNames.includes(n));
      throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
    }

    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        roleId: role.id,
      })),
      skipDuplicates: true,
    });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.findById(userId);

    const permissions = new Set<string>();
    for (const userRole of user.userRoles) {
      for (const rp of userRole.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }

    return Array.from(permissions);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    return user.userRoles.map((ur) => ur.role.name);
  }
}
