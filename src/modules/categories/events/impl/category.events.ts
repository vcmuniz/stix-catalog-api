import { DomainEvent } from '../../../../shared/events/domain/domain.event';

export class CategoryCreatedEvent extends DomainEvent {
  readonly eventType = 'CATEGORY_CREATED';

  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly parentId?: string,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.categoryId;
  }
}

export class CategoryUpdatedEvent extends DomainEvent {
  readonly eventType = 'CATEGORY_UPDATED';

  constructor(
    public readonly categoryId: string,
    public readonly name: string,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.categoryId;
  }
}
