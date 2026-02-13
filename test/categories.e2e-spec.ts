import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;

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
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  describe('POST /categories', () => {
    it('should create a category', async () => {
      const createCategoryDto = { name: 'Electronics-' + Date.now() };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.parentId).toBeNull();
    });

    it('should reject duplicate category name', async () => {
      const createCategoryDto = { name: 'Smartphones-' + Date.now() };

      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(409);
    });

    it('should reject invalid parent category', async () => {
      const createCategoryDto = {
        name: 'Laptops-' + Date.now(),
        parentId: 'invalid-parent-id',
      };

      await request(app.getHttpServer())
        .post('/categories')
        .send(createCategoryDto)
        .expect(400);
    });
  });

  describe('GET /categories', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Category1-' + Date.now() })
        .expect(201);

      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Category2-' + Date.now() })
        .expect(201);
    });

    it('should retrieve all categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /categories/:id', () => {
    let categoryId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'TestCategory-' + Date.now() })
        .expect(201);

      categoryId = response.body.id;
    });

    it('should retrieve a category by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .expect(200);

      expect(response.body.id).toBe(categoryId);
      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 for non-existent category', async () => {
      await request(app.getHttpServer())
        .get('/categories/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PUT /categories/:id', () => {
    let categoryId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'UpdateableCategory-' + Date.now() })
        .expect(201);

      categoryId = response.body.id;
    });

    it('should update a category', async () => {
      const updateDto = { name: 'UpdatedCategory-' + Date.now() };

      const response = await request(app.getHttpServer())
        .put(`/categories/${categoryId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 when updating non-existent category', async () => {
      const updateDto = { name: 'NewName-' + Date.now() };

      await request(app.getHttpServer())
        .put('/categories/00000000-0000-0000-0000-000000000000')
        .send(updateDto)
        .expect(404);
    });
  });
});
