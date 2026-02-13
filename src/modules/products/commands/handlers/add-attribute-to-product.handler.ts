import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AddAttributeToProductCommand } from '../impl/add-attribute-to-product.command';
import { Product } from '../../entities/product.entity';
import { ProductBusinessRules } from '../../domain';
import { AttributeAddedToProductEvent } from '../../events/impl/product.events';

@CommandHandler(AddAttributeToProductCommand)
export class AddAttributeToProductHandler implements ICommandHandler<AddAttributeToProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: AddAttributeToProductCommand): Promise<Product> {
    this.logger.info('Adding attribute to product', {
      productId: command.productId,
      key: command.key,
    });

    const product = await this.productRepository.findOne({
      where: { id: command.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validar se pode adicionar atributo
    ProductBusinessRules.validateCanUpdateCategoriesOrAttributes(product.status);

    // Verificar se atributo com mesma key já existe
    ProductBusinessRules.validateAttributeKeyNotExists(product.attributes, command.key);

    product.attributes.push({ key: command.key, value: command.value });
    const updatedProduct = await this.productRepository.save(product);

    this.logger.info('Attribute added to product successfully', {
      productId: updatedProduct.id,
    });

    // Publicar evento 📢
    await this.eventPublisher.publishEvent(
      new AttributeAddedToProductEvent(
        updatedProduct.id,
        command.key,
        command.value,
      ),
    );

    return updatedProduct;
  }
}
