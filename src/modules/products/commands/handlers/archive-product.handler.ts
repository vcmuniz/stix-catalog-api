import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ArchiveProductCommand } from '../impl/archive-product.command';
import { Product } from '../../entities/product.entity';
import { ProductStatus } from '../../domain';
import { ProductArchivedEvent } from '../../events/impl/product.events';

@CommandHandler(ArchiveProductCommand)
export class ArchiveProductHandler implements ICommandHandler<ArchiveProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: ArchiveProductCommand): Promise<Product> {
    this.logger.info('Archiving product', { productId: command.id });

    const product = await this.productRepository.findOne({
      where: { id: command.id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.status = ProductStatus.ARCHIVED;
    const updatedProduct = await this.productRepository.save(product);

    this.logger.info('Product archived successfully', { productId: updatedProduct.id });

    // Publicar evento 📢
    await this.eventPublisher.publishEvent(new ProductArchivedEvent(updatedProduct.id));

    return updatedProduct;
  }
}
