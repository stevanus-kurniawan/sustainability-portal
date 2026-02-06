import { Module } from '@nestjs/common';
import { SubContentsController } from './sub-contents.controller';
import { SubContentsService } from './sub-contents.service';

@Module({
  controllers: [SubContentsController],
  providers: [SubContentsService],
  exports: [SubContentsService],
})
export class SubContentsModule {}
