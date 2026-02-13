import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DomainEvent } from './domain/domain.event';

@Injectable()
export class KafkaEventPublisher {
  private producer: Producer | null = null;
  private kafka: Kafka | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.configService.get('kafka.brokers') || ['localhost:9092'];
    this.kafka = new Kafka({
      clientId: this.configService.get('kafka.clientId') || 'catalog-service',
      brokers: brokers as string[],
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.info('Kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.info('Kafka producer disconnected');
    }
  }

  async publishEvent(event: DomainEvent): Promise<void> {
    if (!this.producer) {
      this.logger.warn('Producer not initialized, skipping event publish');
      return;
    }

    const topic = this.getTopicForEvent(event);
    const payload = {
      eventId: `${event.aggregateId}-${event.occurredAt.getTime()}`,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      data: event,
    };

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify(payload),
            headers: {
              'correlation-id': `${event.aggregateId}-${Date.now()}`,
              'event-type': event.eventType,
            },
          },
        ],
      });

      this.logger.info('Event published', {
        topic,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      this.logger.error('Failed to publish event', {
        topic,
        eventType: event.eventType,
        error,
      });
      throw error;
    }
  }

  private getTopicForEvent(event: DomainEvent): string {
    if (
      event.eventType.startsWith('PRODUCT') ||
      event.eventType.startsWith('ATTRIBUTE') ||
      event.eventType.startsWith('CATEGORY')
    ) {
      return 'catalog.product.events';
    }
    return 'catalog.events';
  }
}
