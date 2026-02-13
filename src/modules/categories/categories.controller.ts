import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Category } from './entities/category.entity';
import { CreateCategoryCommand } from './commands/impl/create-category.command';
import { UpdateCategoryCommand } from './commands/impl/update-category.command';
import { GetCategoriesQuery } from './queries/impl/get-categories.query';
import { GetCategoryByIdQuery } from './queries/impl/get-category-by-id.query';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully', type: Category })
  @ApiResponse({ status: 409, description: 'Category with this name already exists' })
  @ApiResponse({ status: 400, description: 'Parent category not found' })
  async create(@Body() dto: CreateCategoryCommand): Promise<Category> {
    const command = new CreateCategoryCommand(dto.name, dto.parentId);
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully', type: [Category] })
  async findAll(): Promise<Category[]> {
    const query = new GetCategoriesQuery();
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully', type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
    const query = new GetCategoryByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully', type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category with this name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<UpdateCategoryCommand>,
  ): Promise<Category> {
    const command = new UpdateCategoryCommand(id, dto.name, dto.parentId);
    return this.commandBus.execute(command);
  }
}
