import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consumer, Kafka } from 'kafkajs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AuditLog } from '../entities/audit-log.entity';

/**
 * Kafka Consumer for Audit Logging
 *
 * Listens to events published by the Catalog Service and logs them to AuditLog table.
 * This is the mechanism to implement async audit logging as specified in specs.md
 *
 * Topics:
 * - catalog.product.events: Product creation, activation, archiving, etc
 * - catalog.category.events: Category creation, update, etc
 */
@Injectable()
export class AuditLogConsumer implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.configService.get('kafka.brokers') || ['localhost:9092'];
    
    this.kafka = new Kafka({
      clientId: this.configService.get('kafka.consumerId') || 'catalog-audit-consumer',
      brokers: brokers as string[],
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: this.configService.get('kafka.consumerGroup') || 'audit-log-group',
    });

    await this.consumer.connect();
    this.logger.info('Audit consumer connected to Kafka');

    // Subscribe to product and category event topics
    await this.consumer.subscribe({
      topics: ['catalog.product.events', 'catalog.category.events'],
      fromBeginning: false,
    });

    // Start consuming messages
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleMessage(topic, partition, message);
      },
    });

    this.logger.info('Audit consumer started listening to events');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.logger.info('Audit consumer disconnected');
    }
  }

  private async handleMessage(
    topic: string,
    partition: number,
    message: any,
  ): Promise<void> {
    try {
      if (!message.value) {
        this.logger.warn('Received message without value', { topic, partition });
        return;
      }

      const payload = JSON.parse(message.value.toString());

      this.logger.debug('Processing audit event from Kafka', {
        topic,
        eventType: payload.eventType,
        aggregateId: payload.aggregateId,
      });

      // Determine entity type based on event type
      const entityType = this.getEntityTypeFromEvent(payload.eventType);

      // Save to audit log
      await this.auditRepository.save({
        entityType,
        entityId: payload.aggregateId,
        eventType: payload.eventType,
        payload: payload.data,
      });

      this.logger.info('Audit log saved from Kafka event', {
        eventType: payload.eventType,
        aggregateId: payload.aggregateId,
        entityType,
      });
    } catch (error) {
      this.logger.error('Failed to process Kafka message for audit', {
        topic,
        error: error instanceof Error ? error.message : String(error),
        message: message.value?.toString(),
      });
      // Don't re-throw to avoid stopping the consumer
    }
  }

  private getEntityTypeFromEvent(eventType: string): string {
    if (eventType.startsWith('PRODUCT') || eventType.startsWith('ATTRIBUTE') || eventType.startsWith('CATEGORY_ADDED') || eventType.startsWith('CATEGORY_REMOVED')) {
      return 'Product';
    }
    if (eventType.startsWith('CATEGORY')) {
      return 'Category';
    }
    return 'Unknown';
  }
}
