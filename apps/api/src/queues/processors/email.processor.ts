import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../constants';

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJob>): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.data.subject}`);

    try {
      // TODO: Implement actual email sending (e.g., with nodemailer)
      // For now, just log the email
      this.logger.log(`Email sent to ${job.data.to}: ${job.data.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }
}
