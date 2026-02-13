import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateProductCommand } from './commands/impl/create-product.command';
import { ActivateProductCommand } from './commands/impl/activate-product.command';
import { ArchiveProductCommand } from './commands/impl/archive-product.command';
import { AddCategoryToProductCommand } from './commands/impl/add-category-to-product.command';
import { RemoveCategoryFromProductCommand } from './commands/impl/remove-category-from-product.command';
import { AddAttributeToProductCommand } from './commands/impl/add-attribute-to-product.command';
import { UpdateProductAttributeCommand } from './commands/impl/update-product-attribute.command';
import { RemoveProductAttributeCommand } from './commands/impl/remove-product-attribute.command';
import { UpdateProductDescriptionCommand } from './commands/impl/update-product-description.command';
import { GetProductsQuery } from './queries/impl/get-products.query';
import { GetProductByIdQuery } from './queries/impl/get-product-by-id.query';
import { Product } from './entities/product.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: Product })
  @ApiResponse({ status: 409, description: 'Product with this name already exists' })
  @ApiResponse({ status: 400, description: 'One or more categories not found' })
  async create(@Body() dto: CreateProductCommand): Promise<Product> {
    const command = new CreateProductCommand(dto.name, dto.description, dto.categoryIds, dto.attributes);
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully', type: [Product] })
  async findAll(): Promise<Product[]> {
    const query = new GetProductsQuery();
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    const query = new GetProductByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product activated successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Product validation failed' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    const command = new ActivateProductCommand(id);
    return this.commandBus.execute(command);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product archived successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    const command = new ArchiveProductCommand(id);
    return this.commandBus.execute(command);
  }

  @Post(':id/categories/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add category to product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category added successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product or category not found' })
  @ApiResponse({ status: 400, description: 'Category already associated or product archived' })
  async addCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<Product> {
    const command = new AddCategoryToProductCommand(id, categoryId);
    return this.commandBus.execute(command);
  }

  @Delete(':id/categories/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove category from product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category removed successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product or category not found' })
  @ApiResponse({ status: 400, description: 'Category not associated with product' })
  async removeCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<Product> {
    const command = new RemoveCategoryFromProductCommand(id, categoryId);
    return this.commandBus.execute(command);
  }

  @Post(':id/attributes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add attribute to product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Attribute added successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Duplicate key or product archived' })
  async addAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { key: string; value: string | number | boolean },
  ): Promise<Product> {
    const command = new AddAttributeToProductCommand(id, body.key, body.value);
    return this.commandBus.execute(command);
  }

  @Put(':id/attributes/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product attribute' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'key', description: 'Attribute key' })
  @ApiResponse({ status: 200, description: 'Attribute updated successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product or attribute not found' })
  @ApiResponse({ status: 400, description: 'Product archived' })
  async updateAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('key') key: string,
    @Body() body: { value: string | number | boolean },
  ): Promise<Product> {
    const command = new UpdateProductAttributeCommand(id, key, body.value);
    return this.commandBus.execute(command);
  }

  @Delete(':id/attributes/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove product attribute' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'key', description: 'Attribute key' })
  @ApiResponse({ status: 200, description: 'Attribute removed successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product or attribute not found' })
  @ApiResponse({ status: 400, description: 'Product archived' })
  async removeAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('key') key: string,
  ): Promise<Product> {
    const command = new RemoveProductAttributeCommand(id, key);
    return this.commandBus.execute(command);
  }

  @Put(':id/description')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product description (works for any status including ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product description updated successfully', type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Invalid description' })
  async updateDescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { description: string },
  ): Promise<Product> {
    const command = new UpdateProductDescriptionCommand(id, body.description);
    return this.commandBus.execute(command);
  }
}
