import { IEvent } from '@nestjs/cqrs';

export abstract class DomainEvent implements IEvent {
  abstract readonly aggregateId: string;
  abstract readonly eventType: string;

  readonly occurredAt = new Date();
}
