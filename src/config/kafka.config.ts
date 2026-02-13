import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  clientId: process.env.KAFKA_CLIENT_ID || 'catalog-service',
  consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'audit-service-group',
  retryAttempts: parseInt(process.env.KAFKA_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.KAFKA_RETRY_DELAY || '5000', 10),
}));
