import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ActivateProductCommand } from '../impl/activate-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus, ProductBusinessRules } from '../../domain';
import { ProductActivatedEvent } from '../../events/impl/product.events';

@CommandHandler(ActivateProductCommand)
export class ActivateProductHandler implements ICommandHandler<ActivateProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: ActivateProductCommand): Promise<Product> {
    this.logger.info('Activating product', { productId: command.id });

    const product = await this.productRepository.findOne({
      where: { id: command.id },
      relations: ['categories'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validar regras de negócio
    ProductBusinessRules.validateCanActivate(
      product.status,
      product.categories.length,
      product.attributes.length,
    );

    product.status = ProductStatus.ACTIVE;
    const updatedProduct = await this.productRepository.save(product);

    this.logger.info('Product activated successfully', { productId: updatedProduct.id });

    // Publicar evento 📢
    await this.eventPublisher.publishEvent(new ProductActivatedEvent(updatedProduct.id));

    return updatedProduct;
  }
}
