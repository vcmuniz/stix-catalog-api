import { IsString, IsOptional, MaxLength, MinLength, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductAttributeDto {
  @ApiProperty({ example: 'color' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: 'blue' })
  @IsNotEmpty()
  value!: string | number | boolean;
}

export class CreateProductCommand {
  @ApiProperty({ example: 'Laptop Dell XPS 13' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'High-performance laptop' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @IsOptional()
  @IsArray()
  categoryIds?: string[];

  @ApiPropertyOptional({ example: [{ key: 'color', value: 'silver' }] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  constructor(name: string, description?: string, categoryIds?: string[], attributes?: ProductAttributeDto[]) {
    this.name = name;
    this.description = description;
    this.categoryIds = categoryIds;
    this.attributes = attributes;
  }
}
