import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationStatus, NotificationObjectType, NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Notification CRUD
  // ==========================================

  async findAll(params: {
    userEmail?: string;
    status?: NotificationStatus;
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
    status?: NotificationStatus;
  }) {
    return this.prisma.notification.create({
      data: {
        ...data,
        status: data.status || NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async markAsRead(id: string) {
    await this.findById(id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userEmail: string) {
    return this.prisma.notification.updateMany({
      where: {
        userEmail,
        status: NotificationStatus.SENT,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userEmail: string) {
    return this.prisma.notification.count({
      where: {
        userEmail,
        status: NotificationStatus.SENT,
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
    objectType?: NotificationObjectType;
    channel?: NotificationChannel;
    isActive?: boolean;
  }) {
    return this.prisma.notificationRule.findMany({
      where: params,
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
    objectType: NotificationObjectType;
    daysBeforeExpiry: number;
    channel: NotificationChannel;
    isActive?: boolean;
  }) {
    return this.prisma.notificationRule.create({
      data: {
        ...data,
        isActive: data.isActive ?? true,
      },
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
