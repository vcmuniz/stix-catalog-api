import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UpdateProductDescriptionCommand } from '../impl/update-product-description.command';
import { Product } from '../../entities/product.entity';

@CommandHandler(UpdateProductDescriptionCommand)
export class UpdateProductDescriptionHandler implements ICommandHandler<UpdateProductDescriptionCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateProductDescriptionCommand): Promise<Product> {
    this.logger.info('Updating product description', { productId: command.id });

    const product = await this.productRepository.findOne({
      where: { id: command.id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!command.description || command.description.trim() === '') {
      throw new BadRequestException('Description cannot be empty');
    }

    product.description = command.description.trim();
    const updatedProduct = await this.productRepository.save(product);

    this.logger.info('Product description updated successfully', {
      productId: updatedProduct.id,
      descriptionLength: updatedProduct.description?.length,
    });

    return updatedProduct;
  }
}
