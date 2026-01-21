import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { QUEUE_NAMES } from './constants';

export { QUEUE_NAMES };

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.DOCUMENT_PROCESSING },
    ),
  ],
  providers: [EmailProcessor, NotificationProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
