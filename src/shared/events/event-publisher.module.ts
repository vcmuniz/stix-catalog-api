import { Module } from '@nestjs/common';
import { KafkaEventPublisher } from './kafka-event-publisher';
import { EventPublishingService } from './event-publishing.service';

@Module({
  providers: [KafkaEventPublisher, EventPublishingService],
  exports: [KafkaEventPublisher, EventPublishingService],
})
export class EventPublisherModule {}
