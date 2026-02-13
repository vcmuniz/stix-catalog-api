import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RemoveCategoryFromProductCommand } from '../impl/remove-category-from-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { CategoryRemovedFromProductEvent } from '../../events/impl/product.events';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

@CommandHandler(RemoveCategoryFromProductCommand)
export class RemoveCategoryFromProductHandler
  implements ICommandHandler<RemoveCategoryFromProductCommand>
{
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: RemoveCategoryFromProductCommand): Promise<Product> {
    this.logger.info('Removing category from product', {
      productId: command.productId,
      categoryId: command.categoryId,
    });

    const product = await this.productRepository.findOne({
      where: { id: command.productId },
      relations: ['categories', 'attributes'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate: ARCHIVED products cannot have categories changed
    if (product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Cannot modify archived product');
    }

    // Validate: category exists in product
    const categoryExists = product.categories.some((c) => c.id === command.categoryId);
    if (!categoryExists) {
      throw new NotFoundException('Category not associated with this product');
    }

    // Remove the category
    product.categories = product.categories.filter((c) => c.id !== command.categoryId);

    // Validate: cannot have 0 categories if product is ACTIVE
    if (product.status === ProductStatus.ACTIVE && product.categories.length === 0) {
      throw new BadRequestException('ACTIVE product must have at least 1 category');
    }

    const updatedProduct = await this.productRepository.save(product);

    // Publish event
    await this.eventPublisher.publishEvent(
      new CategoryRemovedFromProductEvent(command.productId, command.categoryId),
    );

    this.logger.info('Category removed from product successfully', {
      productId: command.productId,
      categoryId: command.categoryId,
    });

    return updatedProduct;
  }
}
