import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Products Controller (E2E)', () => {
  let app: INestApplication;
  let categoryId: string;
  let nameCounter = 0;

  const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${++nameCounter}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();

    // Create a category for product tests with unique name
    const uniqueCategoryName = `Electronics-${Date.now()}`;
    const categoryRes = await request(app.getHttpServer())
      .post('/categories')
      .send({ name: uniqueCategoryName });

    if (categoryRes.status !== 201) {
      console.error('Failed to create category:', categoryRes.body);
      throw new Error(`Expected 201, got ${categoryRes.status}: ${JSON.stringify(categoryRes.body)}`);
    }
    categoryId = categoryRes.body.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 20000);

  describe('POST /products', () => {
    it('should create a product in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('MacBook'),
          description: 'High-performance laptop',
          categoryIds: [categoryId],
          attributes: [{ key: 'cpu', value: 'M3 Pro' }],
        })
        .expect(201);

      expect(response.body.status).toBe('DRAFT');
      expect(response.body.attributes).toHaveLength(1);
    });

    it('should return 400 when category not found', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('TestProd'),
          description: 'Test',
          categoryIds: ['550e8400-e29b-41d4-a716-446655440000'],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should return 400 for duplicate attribute keys', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('TestProd'),
          description: 'Test',
          categoryIds: [categoryId],
          attributes: [
            { key: 'cpu', value: 'M3' },
            { key: 'cpu', value: 'Intel' },
          ],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Duplicate attribute key');
        });
    });
  });

  describe('POST /products/:id/activate', () => {
    let productId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ActivatableProd'),
          description: 'Can be activated',
          categoryIds: [categoryId],
          attributes: [{ key: 'brand', value: 'TestBrand' }],
        })
        .expect(201);
      productId = res.body.id;
    });

    it('should activate product with valid requirements', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/activate`)
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');
    });

    it('should return 400 when activating without category', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('NoCategoryProd'),
          description: 'Test',
          categoryIds: [],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/activate`)
        .expect(400)
        .expect((r) => {
          expect(r.body.message).toContain('category');
        });
    });

    it('should return 400 when activating without attributes', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('NoAttrProd'),
          description: 'Test',
          categoryIds: [categoryId],
          attributes: [],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/activate`)
        .expect(400)
        .expect((r) => {
          expect(r.body.message).toContain('attribute');
        });
    });

    it('should return 404 when product not found', async () => {
      await request(app.getHttpServer())
        .post('/products/550e8400-e29b-41d4-a716-446655440000/activate')
        .expect(404);
    });
  });

  describe('POST /products/:id/archive', () => {
    let activeProductId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ArchivableProd'),
          description: 'Can be archived',
          categoryIds: [categoryId],
          attributes: [{ key: 'type', value: 'Test' }],
        })
        .expect(201);
      activeProductId = res.body.id;

      // Activate it
      await request(app.getHttpServer())
        .post(`/products/${activeProductId}/activate`)
        .expect(200);
    });

    it('should archive active product', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${activeProductId}/archive`)
        .expect(200);

      expect(response.body.status).toBe('ARCHIVED');
    });

    it('should not allow reactivation of archived product', async () => {
      await request(app.getHttpServer())
        .post(`/products/${activeProductId}/activate`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Archived products cannot be reactivated');
        });
    });
  });

  describe('GET /products/:id', () => {
    let productId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('FetchableProd'),
          description: 'Can be fetched',
          categoryIds: [categoryId],
          attributes: [{ key: 'key1', value: 'value1' }],
        })
        .expect(201);
      productId = res.body.id;
    });

    it('should retrieve product by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body.id).toBe(productId);
      expect(response.body.status).toBe('DRAFT');
    });

    it('should return 404 for nonexistent product', async () => {
      await request(app.getHttpServer())
        .get('/products/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);
    });
  });

  describe('GET /products', () => {
    beforeAll(async () => {
      // Create multiple products
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/products')
          .send({
            name: uniqueName(`ListProd-${i}`),
            description: 'For listing',
            categoryIds: [categoryId],
            attributes: [{ key: 'index', value: String(i) }],
          })
          .expect(201);
      }
    });

    it('should list all products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PUT /products/:id/description', () => {
    let productId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('UpdatableProd'),
          description: 'Original description',
          categoryIds: [categoryId],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);
      productId = res.body.id;
    });

    it('should update description for product in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .put(`/products/${productId}/description`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.description).toBe('Updated description');
    });

    it('should update description for product in ACTIVE status', async () => {
      // Create and activate
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ActiveUpd'),
          description: 'Active',
          categoryIds: [categoryId],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/activate`)
        .expect(200);

      // Update description
      const updated = await request(app.getHttpServer())
        .put(`/products/${res.body.id}/description`)
        .send({ description: 'Updated while active' })
        .expect(200);

      expect(updated.body.description).toBe('Updated while active');
    });

    it('should allow description update for ARCHIVED product', async () => {
      // Create, activate, and archive
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ArchivedUpd'),
          description: 'Archived',
          categoryIds: [categoryId],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/activate`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/archive`)
        .expect(200);

      // Update description - should succeed
      const updated = await request(app.getHttpServer())
        .put(`/products/${res.body.id}/description`)
        .send({ description: 'Updated while archived' })
        .expect(200);

      expect(updated.body.description).toBe('Updated while archived');
      expect(updated.body.status).toBe('ARCHIVED');
    });

    it('should return 400 for empty description', async () => {
      await request(app.getHttpServer())
        .put(`/products/${productId}/description`)
        .send({ description: '' })
        .expect(400);
    });

    it('should return 400 for whitespace-only description', async () => {
      await request(app.getHttpServer())
        .put(`/products/${productId}/description`)
        .send({ description: '   ' })
        .expect(400);
    });

    it('should return 404 for nonexistent product', async () => {
      await request(app.getHttpServer())
        .put('/products/550e8400-e29b-41d4-a716-446655440000/description')
        .send({ description: 'New description' })
        .expect(404);
    });
  });

  describe('POST /products/:id/categories', () => {
    let productId: string;
    let newCategoryId: string;

    beforeAll(async () => {
      // Create product
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ProdForCat'),
          description: 'Test',
          categoryIds: [categoryId],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);
      productId = res.body.id;

      // Create another category
      const catRes = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: uniqueName('Accessories') })
        .expect(201);
      newCategoryId = catRes.body.id;
    });

    it('should add category to product in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/categories/${newCategoryId}`)
        .expect(200);

      expect(response.body.categories).toContainEqual(
        expect.objectContaining({ id: newCategoryId }),
      );
    });

    it('should return 400 when category not found', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/categories/${categoryId}`)
        .send({ categoryId: 'nonexistent' })
        .expect(400);
    });

    it('should return 400 when product in ARCHIVED status', async () => {
      // Create, activate, and archive
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ArchivedForCat'),
          description: 'Test',
          categoryIds: [categoryId],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/activate`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/archive`)
        .expect(200);

      // Try to add category
      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/categories/${newCategoryId}`)
        
        .expect(400)
        .expect((r) => {
          expect(r.body.message).toContain('cannot');
        });
    });
  });

  describe('POST /products/:id/attributes', () => {
    let productId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ProdForAttr'),
          description: 'Test',
          categoryIds: [categoryId],
          attributes: [{ key: 'k1', value: 'v1' }],
        })
        .expect(201);
      productId = res.body.id;
    });

    it('should add attribute to product in DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/attributes`)
        .send({ key: 'newKey', value: 'newValue' })
        .expect(200);

      expect(response.body.attributes).toContainEqual(
        expect.objectContaining({ key: 'newKey', value: 'newValue' }),
      );
    });

    it('should return 400 for duplicate attribute key', async () => {
      await request(app.getHttpServer())
        .post(`/products/${productId}/attributes`)
        .send({ key: 'newKey', value: 'different' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
        });
    });

    it('should return 400 when product in ARCHIVED status', async () => {
      // Create, activate, and archive
      const res = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('ArchivedForAttr'),
          description: 'Test',
          categoryIds: [categoryId],
          attributes: [{ key: 'k', value: 'v' }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/activate`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/archive`)
        .expect(200);

      // Try to add attribute
      await request(app.getHttpServer())
        .post(`/products/${res.body.id}/attributes`)
        .send({ key: 'newAttr', value: 'value' })
        .expect(400)
        .expect((r) => {
          expect(r.body.message).toContain('cannot');
        });
    });
  });

  describe('Complete flow: DRAFT -> ACTIVE -> ARCHIVED', () => {
    it('should handle complete product lifecycle', async () => {
      // 1. Create (DRAFT)
      const created = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: uniqueName('LifecycleProd'),
          description: 'Full lifecycle test',
          categoryIds: [],
          attributes: [{ key: 'stage', value: 'draft' }],
        })
        .expect(201);

      expect(created.body.status).toBe('DRAFT');
      const productId = created.body.id;

      // 2. Add a category
      const categories = await request(app.getHttpServer())
        .post(`/products/${productId}/categories/${categoryId}`)
        .expect(200);

      // 3. Activate
      const activated = await request(app.getHttpServer())
        .post(`/products/${productId}/activate`)
        .expect(200);

      expect(activated.body.status).toBe('ACTIVE');

      // 4. Update description while ACTIVE
      const updated = await request(app.getHttpServer())
        .put(`/products/${productId}/description`)
        .send({ description: 'Updated while active' })
        .expect(200);

      expect(updated.body.description).toBe('Updated while active');

      // 5. Archive
      const archived = await request(app.getHttpServer())
        .post(`/products/${productId}/archive`)
        .expect(200);

      expect(archived.body.status).toBe('ARCHIVED');

      // 6. Verify cannot reactivate
      await request(app.getHttpServer())
        .post(`/products/${productId}/activate`)
        .expect(400);

      // 7. Verify can still update description
      const finalDesc = await request(app.getHttpServer())
        .put(`/products/${productId}/description`)
        .send({ description: 'Final description' })
        .expect(200);

      expect(finalDesc.body.description).toBe('Final description');
    });
  });
});
