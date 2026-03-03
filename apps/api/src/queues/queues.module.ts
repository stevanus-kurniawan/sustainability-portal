import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { QUEUE_NAMES } from './constants';

export { QUEUE_NAMES };

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.EMAIL,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      },
      {
        name: QUEUE_NAMES.NOTIFICATION,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      },
      {
        name: QUEUE_NAMES.DOCUMENT_PROCESSING,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      },
    ),
  ],
  providers: [EmailProcessor, NotificationProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
