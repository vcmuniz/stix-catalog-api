import { DomainEvent } from '../../../../shared/events/domain/domain.event';

export class ProductCreatedEvent extends DomainEvent {
  readonly eventType = 'PRODUCT_CREATED';

  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly description: string | null,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class ProductActivatedEvent extends DomainEvent {
  readonly eventType = 'PRODUCT_ACTIVATED';

  constructor(public readonly productId: string) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class ProductArchivedEvent extends DomainEvent {
  readonly eventType = 'PRODUCT_ARCHIVED';

  constructor(public readonly productId: string) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class CategoryAddedToProductEvent extends DomainEvent {
  readonly eventType = 'CATEGORY_ADDED_TO_PRODUCT';

  constructor(
    public readonly productId: string,
    public readonly categoryId: string,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class AttributeAddedToProductEvent extends DomainEvent {
  readonly eventType = 'ATTRIBUTE_ADDED_TO_PRODUCT';

  constructor(
    public readonly productId: string,
    public readonly key: string,
    public readonly value: string | number | boolean,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class CategoryRemovedFromProductEvent extends DomainEvent {
  readonly eventType = 'CATEGORY_REMOVED_FROM_PRODUCT';

  constructor(
    public readonly productId: string,
    public readonly categoryId: string,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class AttributeRemovedFromProductEvent extends DomainEvent {
  readonly eventType = 'ATTRIBUTE_REMOVED_FROM_PRODUCT';

  constructor(
    public readonly productId: string,
    public readonly key: string,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}

export class AttributeUpdatedEvent extends DomainEvent {
  readonly eventType = 'ATTRIBUTE_UPDATED';

  constructor(
    public readonly productId: string,
    public readonly key: string,
    public readonly value: string | number | boolean,
  ) {
    super();
  }

  get aggregateId(): string {
    return this.productId;
  }
}
