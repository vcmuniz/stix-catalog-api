import { BadRequestException } from '@nestjs/common';
import { ProductStatus } from './product.enum';

export interface ProductAttribute {
  key: string;
  value: string | number | boolean;
}

export class ProductBusinessRules {
  static validateCanActivate(
    status: ProductStatus,
    categoriesCount: number,
    attributesCount: number,
  ): void {
    if (status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Archived products cannot be reactivated');
    }

    if (status !== ProductStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT products can be activated');
    }

    if (categoriesCount < 1) {
      throw new BadRequestException('Product must have at least 1 category to be activated');
    }

    if (attributesCount < 1) {
      throw new BadRequestException('Product must have at least 1 attribute to be activated');
    }
  }

  static validateCanReactivate(status: ProductStatus): void {
    if (status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Archived products cannot be reactivated');
    }
  }

  static validateCanUpdateCategoriesOrAttributes(status: ProductStatus): void {
    if (status === ProductStatus.ARCHIVED) {
      throw new BadRequestException('Archived products cannot have categories or attributes modified');
    }
  }

  static validateAttributeKeyUniqueness(
    attributes: ProductAttribute[],
  ): void {
    const keys = new Set<string>();
    for (const attr of attributes) {
      if (keys.has(attr.key)) {
        throw new BadRequestException(`Duplicate attribute key: ${attr.key}`);
      }
      keys.add(attr.key);
    }
  }

  static validateAttributeKeyNotExists(
    existingAttributes: ProductAttribute[],
    newKey: string,
  ): void {
    if (existingAttributes.some((a) => a.key === newKey)) {
      throw new BadRequestException(`Attribute with key "${newKey}" already exists`);
    }
  }
}
