import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RemoveProductAttributeCommand } from '../impl/remove-product-attribute.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { AttributeRemovedFromProductEvent } from '../../events/impl/product.events';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

@CommandHandler(RemoveProductAttributeCommand)
export class RemoveProductAttributeHandler
  implements ICommandHandler<RemoveProductAttributeCommand>
{
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: RemoveProductAttributeCommand): Promise<Product> {
    this.logger.info('Removing attribute from product', {
      productId: command.productId,
      key: command.key,
    });

    const product = await this.productRepository.findOne({
      where: { id: command.productId },
      relations: ['categories'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate: ARCHIVED products cannot have attributes changed
    if (product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Cannot modify archived product');
    }

    // Validate: attribute exists in product
    const attributeExists = product.attributes.some((a) => a.key === command.key);
    if (!attributeExists) {
      throw new NotFoundException('Attribute not associated with this product');
    }

    // Remove the attribute
    product.attributes = product.attributes.filter((a) => a.key !== command.key);

    // Validate: cannot have 0 attributes if product is ACTIVE
    if (product.status === ProductStatus.ACTIVE && product.attributes.length === 0) {
      throw new BadRequestException('ACTIVE product must have at least 1 attribute');
    }

    const updatedProduct = await this.productRepository.save(product);

    // Publish event
    await this.eventPublisher.publishEvent(
      new AttributeRemovedFromProductEvent(command.productId, command.key),
    );

    this.logger.info('Attribute removed from product successfully', {
      productId: command.productId,
      key: command.key,
    });

    return updatedProduct;
  }
}
