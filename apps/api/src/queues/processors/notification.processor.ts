import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../constants';

export interface NotificationJob {
  userId: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJob>): Promise<void> {
    this.logger.log(`Processing notification job ${job.id}: ${job.data.title}`);

    try {
      // TODO: Implement actual notification (e.g., WebSocket, push notification)
      // For now, just log the notification
      this.logger.log(`Notification for user ${job.data.userId}: ${job.data.title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }
}
