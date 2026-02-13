import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { KafkaEventPublisher } from '../events/kafka-event-publisher';
import { DomainEvent } from '../events/domain/domain.event';

/**
 * Service to publish events to Kafka
 * 
 * Centralized event publishing for all command handlers.
 * Events are published to Kafka for async processing by consumers.
 */
@Injectable()
export class EventPublishingService {
  constructor(
    private readonly kafkaPublisher: KafkaEventPublisher,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  /**
   * Publish event to Kafka
   * 
   * @param event Domain event to publish
   * @throws Error if Kafka publishing fails
   */
  async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.kafkaPublisher.publishEvent(event);
      this.logger.debug('Event published to Kafka', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      this.logger.error('Failed to publish event to Kafka', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
