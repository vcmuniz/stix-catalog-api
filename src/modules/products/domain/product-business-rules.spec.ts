import { BadRequestException } from '@nestjs/common';
import { ProductBusinessRules } from './product-business-rules';
import { ProductStatus } from './product.enum';

describe('ProductBusinessRules', () => {
  describe('validateAttributeKeyUniqueness', () => {
    it('should pass with unique keys', () => {
      const attributes = [
        { key: 'color', value: 'blue' },
        { key: 'size', value: 'large' },
        { key: 'material', value: 'cotton' },
      ];

      expect(() => {
        ProductBusinessRules.validateAttributeKeyUniqueness(attributes);
      }).not.toThrow();
    });

    it('should throw error when keys are duplicated', () => {
      const attributes = [
        { key: 'color', value: 'blue' },
        { key: 'size', value: 'large' },
        { key: 'color', value: 'red' }, // Duplicate key
      ];

      expect(() => {
        ProductBusinessRules.validateAttributeKeyUniqueness(attributes);
      }).toThrow(BadRequestException);
      expect(() => {
        ProductBusinessRules.validateAttributeKeyUniqueness(attributes);
      }).toThrow('Duplicate attribute key: color');
    });

    it('should handle empty attributes array', () => {
      expect(() => {
        ProductBusinessRules.validateAttributeKeyUniqueness([]);
      }).not.toThrow();
    });

    it('should handle single attribute', () => {
      const attributes = [{ key: 'color', value: 'blue' }];

      expect(() => {
        ProductBusinessRules.validateAttributeKeyUniqueness(attributes);
      }).not.toThrow();
    });
  });

  describe('validateAttributeKeyNotExists', () => {
    it('should pass when key does not exist', () => {
      const existingAttributes = [
        { key: 'color', value: 'blue' },
        { key: 'size', value: 'large' },
      ];

      expect(() => {
        ProductBusinessRules.validateAttributeKeyNotExists(
          existingAttributes,
          'material',
        );
      }).not.toThrow();
    });

    it('should throw error when key already exists', () => {
      const existingAttributes = [
        { key: 'color', value: 'blue' },
        { key: 'size', value: 'large' },
      ];

      expect(() => {
        ProductBusinessRules.validateAttributeKeyNotExists(
          existingAttributes,
          'color',
        );
      }).toThrow(BadRequestException);
      expect(() => {
        ProductBusinessRules.validateAttributeKeyNotExists(
          existingAttributes,
          'color',
        );
      }).toThrow('Attribute with key "color" already exists');
    });

    it('should handle empty existing attributes', () => {
      expect(() => {
        ProductBusinessRules.validateAttributeKeyNotExists([], 'color');
      }).not.toThrow();
    });

    it('should be case-sensitive', () => {
      const existingAttributes = [{ key: 'Color', value: 'blue' }];

      expect(() => {
        ProductBusinessRules.validateAttributeKeyNotExists(
          existingAttributes,
          'color',
        );
      }).not.toThrow();
    });
  });

  describe('validateCanActivate', () => {
    it('should pass when all conditions are met', () => {
      expect(() => {
        ProductBusinessRules.validateCanActivate(
          ProductStatus.DRAFT,
          1,
          1,
        );
      }).not.toThrow();
    });

    it('should throw explicitly when product is ARCHIVED', () => {
      expect(() => {
        ProductBusinessRules.validateCanActivate(
          ProductStatus.ARCHIVED,
          1,
          1,
        );
      }).toThrow('Archived products cannot be reactivated');
    });

    it('should throw when status is not DRAFT', () => {
      expect(() => {
        ProductBusinessRules.validateCanActivate(
          ProductStatus.ACTIVE,
          1,
          1,
        );
      }).toThrow('Only DRAFT products can be activated');
    });

    it('should throw when no categories', () => {
      expect(() => {
        ProductBusinessRules.validateCanActivate(ProductStatus.DRAFT, 0, 1);
      }).toThrow('Product must have at least 1 category to be activated');
    });

    it('should throw when no attributes', () => {
      expect(() => {
        ProductBusinessRules.validateCanActivate(ProductStatus.DRAFT, 1, 0);
      }).toThrow('Product must have at least 1 attribute to be activated');
    });
  });

  describe('validateCanReactivate', () => {
    it('should pass when product is DRAFT', () => {
      expect(() => {
        ProductBusinessRules.validateCanReactivate(ProductStatus.DRAFT);
      }).not.toThrow();
    });

    it('should pass when product is ACTIVE', () => {
      expect(() => {
        ProductBusinessRules.validateCanReactivate(ProductStatus.ACTIVE);
      }).not.toThrow();
    });

    it('should throw explicitly when product is ARCHIVED', () => {
      expect(() => {
        ProductBusinessRules.validateCanReactivate(ProductStatus.ARCHIVED);
      }).toThrow('Archived products cannot be reactivated');
    });
  });

  describe('validateCanUpdateCategoriesOrAttributes', () => {
    it('should pass when product is DRAFT', () => {
      expect(() => {
        ProductBusinessRules.validateCanUpdateCategoriesOrAttributes(
          ProductStatus.DRAFT,
        );
      }).not.toThrow();
    });

    it('should pass when product is ACTIVE', () => {
      expect(() => {
        ProductBusinessRules.validateCanUpdateCategoriesOrAttributes(
          ProductStatus.ACTIVE,
        );
      }).not.toThrow();
    });

    it('should throw when product is ARCHIVED', () => {
      expect(() => {
        ProductBusinessRules.validateCanUpdateCategoriesOrAttributes(
          ProductStatus.ARCHIVED,
        );
      }).toThrow('Archived products cannot have categories or attributes modified');
    });
  });
});
