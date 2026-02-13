import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UpdateProductAttributeCommand } from '../impl/update-product-attribute.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { AttributeUpdatedEvent } from '../../events/impl/product.events';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';

@CommandHandler(UpdateProductAttributeCommand)
export class UpdateProductAttributeHandler
  implements ICommandHandler<UpdateProductAttributeCommand>
{
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: UpdateProductAttributeCommand): Promise<Product> {
    this.logger.info('Updating product attribute', {
      productId: command.productId,
      key: command.key,
      newValue: command.value,
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
    const attribute = product.attributes.find((a) => a.key === command.key);
    if (!attribute) {
      throw new NotFoundException('Attribute not associated with this product');
    }

    // Update the attribute
    attribute.value = command.value;

    const updatedProduct = await this.productRepository.save(product);

    // Publish event
    await this.eventPublisher.publishEvent(
      new AttributeUpdatedEvent(command.productId, command.key, command.value),
    );

    this.logger.info('Product attribute updated successfully', {
      productId: command.productId,
      key: command.key,
      newValue: command.value,
    });

    return updatedProduct;
  }
}
