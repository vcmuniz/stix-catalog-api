import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventPublishingService } from '../../../../shared/events/event-publishing.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AddCategoryToProductCommand } from '../impl/add-category-to-product.command';
import { Product } from '../../entities/product.entity';
import { Category } from '../../../categories/entities/category.entity';
import { ProductBusinessRules } from '../../domain';
import { CategoryAddedToProductEvent } from '../../events/impl/product.events';

@CommandHandler(AddCategoryToProductCommand)
export class AddCategoryToProductHandler implements ICommandHandler<AddCategoryToProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly eventPublisher: EventPublishingService,
  ) {}

  async execute(command: AddCategoryToProductCommand): Promise<Product> {
    this.logger.info('Adding category to product', {
      productId: command.productId,
      categoryId: command.categoryId,
    });

    const product = await this.productRepository.findOne({
      where: { id: command.productId },
      relations: ['categories'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validar se pode adicionar categoria
    ProductBusinessRules.validateCanUpdateCategoriesOrAttributes(product.status);

    const category = await this.categoryRepository.findOne({
      where: { id: command.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Verificar se categoria já está associada
    if (product.categories.some((c) => c.id === command.categoryId)) {
      throw new BadRequestException('Category already associated with this product');
    }

    product.categories.push(category);
    const updatedProduct = await this.productRepository.save(product);

    this.logger.info('Category added to product successfully', {
      productId: updatedProduct.id,
    });

    // Publicar evento 📢
    await this.eventPublisher.publishEvent(
      new CategoryAddedToProductEvent(updatedProduct.id, command.categoryId),
    );

    return updatedProduct;
  }
}
