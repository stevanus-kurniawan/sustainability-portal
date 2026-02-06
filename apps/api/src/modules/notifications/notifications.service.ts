import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Notification CRUD
  // ==========================================

  async findAll(params: {
    userEmail?: string;
    status?: 'SENT' | 'READ' | 'FAILED';
    skip?: number;
    take?: number;
  }) {
    const { userEmail, status, skip, take } = params;

    return this.prisma.notification.findMany({
      where: {
        ...(userEmail && { userEmail }),
        ...(status && { status }),
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async create(data: {
    userEmail: string;
    title: string;
    message: string;
    status?: 'SENT' | 'READ' | 'FAILED';
  }) {
    return this.prisma.notification.create({
      data: {
        ...data,
        status: data.status || ('SENT' as 'SENT' | 'READ' | 'FAILED'),
        sentAt: new Date(),
      },
    });
  }

  async markAsRead(id: string) {
    await this.findById(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: 'READ' as 'SENT' | 'READ' | 'FAILED',
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userEmail: string) {
    return this.prisma.notification.updateMany({
      where: {
        userEmail,
        status: 'SENT',
      },
      data: {
        status: 'READ' as 'SENT' | 'READ' | 'FAILED',
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userEmail: string) {
    return this.prisma.notification.count({
      where: {
        userEmail,
        status: 'SENT',
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  // ==========================================
  // Notification Rules
  // ==========================================

  async findAllRules(params?: {
    // keep shape but avoid relying on Prisma enums at compile-time
    objectType?: string;
    channel?: string;
    isActive?: boolean;
  }) {
    return this.prisma.notificationRule.findMany({
      where: (params as any) || undefined,
      orderBy: [{ objectType: 'asc' }, { daysBeforeExpiry: 'desc' }],
    });
  }

  async findRuleById(id: string) {
    const rule = await this.prisma.notificationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Notification rule with ID ${id} not found`);
    }

    return rule;
  }

  async createRule(data: {
    objectType: string;
    daysBeforeExpiry: number;
    channel: string;
    isActive?: boolean;
  }) {
    return this.prisma.notificationRule.create({
      data: {
        ...data,
        isActive: data.isActive ?? true,
      } as any,
    });
  }

  async updateRule(id: string, data: { isActive?: boolean }) {
    await this.findRuleById(id);

    return this.prisma.notificationRule.update({
      where: { id },
      data,
    });
  }

  async deleteRule(id: string) {
    await this.findRuleById(id);

    return this.prisma.notificationRule.delete({
      where: { id },
    });
  }

  async toggleRule(id: string) {
    const rule = await this.findRuleById(id);

    return this.prisma.notificationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  }
}
